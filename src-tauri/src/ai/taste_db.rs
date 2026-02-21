use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

/// Thread-safe wrapper for the taste.db connection, managed by Tauri.
pub struct TasteDbState(pub Mutex<Connection>);

/// Initialize taste.db — creates the database and all tables if they don't exist.
/// Registers sqlite-vec extension before opening the connection.
/// Returns a Connection for use as managed state.
pub fn init_taste_db(app_data_dir: &Path) -> Result<Connection, String> {
    // Register sqlite-vec as auto-extension BEFORE opening the connection
    super::embeddings::register_vec_extension();

    let db_path = app_data_dir.join("taste.db");
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open taste.db: {}", e))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS taste_tags (
            tag TEXT PRIMARY KEY,
            weight REAL NOT NULL DEFAULT 0.0,
            source TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS taste_anchors (
            artist_mbid TEXT PRIMARY KEY,
            artist_name TEXT NOT NULL,
            pinned_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS favorite_artists (
            artist_mbid TEXT PRIMARY KEY,
            artist_name TEXT NOT NULL,
            artist_slug TEXT NOT NULL,
            saved_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ai_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS play_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_path TEXT NOT NULL,
            artist_name TEXT,
            track_title TEXT,
            album_name TEXT,
            played_at INTEGER NOT NULL,
            duration_secs REAL NOT NULL DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at DESC);
        CREATE INDEX IF NOT EXISTS idx_play_history_artist ON play_history(artist_name);
        ",
    )
    .map_err(|e| format!("Failed to create taste.db tables: {}", e))?;

    // Create embedding tables (vec0 virtual table + mapping)
    super::embeddings::create_embedding_tables(&conn)?;

    // Insert default ai_settings if not already present
    let defaults = [
        ("enabled", "false"),
        ("provider", "local"),
        ("api_key", ""),
        ("api_base_url", ""),
        ("api_model", ""),
        ("local_gen_model_status", "none"),
        ("local_embed_model_status", "none"),
        ("private_listening", "false"),
    ];

    for (key, value) in &defaults {
        conn.execute(
            "INSERT OR IGNORE INTO ai_settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )
        .map_err(|e| format!("Failed to insert default setting '{}': {}", key, e))?;
    }

    Ok(conn)
}

/// Get a single AI setting by key.
#[tauri::command]
pub fn get_ai_setting(
    key: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<Option<String>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let result = conn.query_row(
        "SELECT value FROM ai_settings WHERE key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to get setting '{}': {}", key, e)),
    }
}

/// Set (upsert) an AI setting.
#[tauri::command]
pub fn set_ai_setting(
    key: String,
    value: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "INSERT INTO ai_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| format!("Failed to set setting '{}': {}", key, e))?;

    Ok(())
}

/// Get all AI settings as a key-value map.
#[tauri::command]
pub fn get_all_ai_settings(
    state: tauri::State<'_, TasteDbState>,
) -> Result<HashMap<String, String>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT key, value FROM ai_settings")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let settings = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query settings: {}", e))?
        .collect::<Result<HashMap<String, String>, _>>()
        .map_err(|e| format!("Failed to collect settings: {}", e))?;

    Ok(settings)
}

// --- Favorite Artists CRUD ---

#[derive(Debug, Serialize)]
pub struct FavoriteArtist {
    pub artist_mbid: String,
    pub artist_name: String,
    pub artist_slug: String,
    pub saved_at: i64,
}

/// Add (or replace) a favorite artist.
#[tauri::command]
pub fn add_favorite_artist(
    artist_mbid: String,
    artist_name: String,
    artist_slug: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT OR REPLACE INTO favorite_artists (artist_mbid, artist_name, artist_slug, saved_at) VALUES (?1, ?2, ?3, ?4)",
        params![artist_mbid, artist_name, artist_slug, now],
    )
    .map_err(|e| format!("Failed to add favorite: {}", e))?;

    Ok(())
}

/// Remove a favorite artist by MBID.
#[tauri::command]
pub fn remove_favorite_artist(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "DELETE FROM favorite_artists WHERE artist_mbid = ?1",
        params![artist_mbid],
    )
    .map_err(|e| format!("Failed to remove favorite: {}", e))?;

    Ok(())
}

/// Get all favorite artists, ordered by most recently saved.
#[tauri::command]
pub fn get_favorite_artists(
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<FavoriteArtist>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT artist_mbid, artist_name, artist_slug, saved_at FROM favorite_artists ORDER BY saved_at DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let favorites = stmt
        .query_map([], |row| {
            Ok(FavoriteArtist {
                artist_mbid: row.get(0)?,
                artist_name: row.get(1)?,
                artist_slug: row.get(2)?,
                saved_at: row.get(3)?,
            })
        })
        .map_err(|e| format!("Failed to query favorites: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect favorites: {}", e))?;

    Ok(favorites)
}

/// Check if an artist is a favorite.
#[tauri::command]
pub fn is_favorite_artist(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM favorite_artists WHERE artist_mbid = ?1)",
            params![artist_mbid],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check favorite: {}", e))?;

    Ok(exists)
}

// --- Taste Tags CRUD ---

#[derive(Debug, Serialize)]
pub struct TasteTag {
    pub tag: String,
    pub weight: f64,
    pub source: String,
}

/// Get all taste tags, ordered by weight descending.
#[tauri::command]
pub fn get_taste_tags(
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<TasteTag>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT tag, weight, source FROM taste_tags ORDER BY weight DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map([], |row| {
            Ok(TasteTag {
                tag: row.get(0)?,
                weight: row.get(1)?,
                source: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query taste tags: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect taste tags: {}", e))?;

    Ok(tags)
}

/// Set (upsert) a taste tag with weight and source.
#[tauri::command]
pub fn set_taste_tag(
    tag: String,
    weight: f64,
    source: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT INTO taste_tags (tag, weight, source, updated_at) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(tag) DO UPDATE SET weight = excluded.weight, source = excluded.source, updated_at = excluded.updated_at",
        params![tag, weight, source, now],
    )
    .map_err(|e| format!("Failed to set taste tag: {}", e))?;

    Ok(())
}

/// Remove a taste tag.
#[tauri::command]
pub fn remove_taste_tag(
    tag: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM taste_tags WHERE tag = ?1", params![tag])
        .map_err(|e| format!("Failed to remove taste tag: {}", e))?;

    Ok(())
}

// --- Taste Anchors CRUD ---

#[derive(Debug, Serialize)]
pub struct TasteAnchor {
    pub artist_mbid: String,
    pub artist_name: String,
    pub pinned_at: i64,
}

/// Get all taste anchors.
#[tauri::command]
pub fn get_taste_anchors(
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<TasteAnchor>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT artist_mbid, artist_name, pinned_at FROM taste_anchors ORDER BY pinned_at DESC")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let anchors = stmt
        .query_map([], |row| {
            Ok(TasteAnchor {
                artist_mbid: row.get(0)?,
                artist_name: row.get(1)?,
                pinned_at: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query taste anchors: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect taste anchors: {}", e))?;

    Ok(anchors)
}

/// Add a taste anchor (pinned artist that strongly influences taste profile).
#[tauri::command]
pub fn add_taste_anchor(
    artist_mbid: String,
    artist_name: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    conn.execute(
        "INSERT OR REPLACE INTO taste_anchors (artist_mbid, artist_name, pinned_at) VALUES (?1, ?2, ?3)",
        params![artist_mbid, artist_name, now],
    )
    .map_err(|e| format!("Failed to add taste anchor: {}", e))?;

    Ok(())
}

/// Remove a taste anchor.
#[tauri::command]
pub fn remove_taste_anchor(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute(
        "DELETE FROM taste_anchors WHERE artist_mbid = ?1",
        params![artist_mbid],
    )
    .map_err(|e| format!("Failed to remove taste anchor: {}", e))?;

    Ok(())
}

// --- Play History CRUD ---

#[derive(Debug, Serialize, Deserialize)]
pub struct PlayRecord {
    pub id: i64,
    pub track_path: String,
    pub artist_name: Option<String>,
    pub track_title: Option<String>,
    pub album_name: Option<String>,
    pub played_at: i64,
    pub duration_secs: f64,
}

/// Record a qualifying play (track reached 70%+ completion).
#[tauri::command]
pub fn record_play(
    track_path: String,
    artist_name: Option<String>,
    track_title: Option<String>,
    album_name: Option<String>,
    duration_secs: f64,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    conn.execute(
        "INSERT INTO play_history (track_path, artist_name, track_title, album_name, played_at, duration_secs)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![track_path, artist_name, track_title, album_name, now, duration_secs],
    ).map_err(|e| format!("Failed to record play: {}", e))?;
    Ok(())
}

/// Get play history ordered by most recent first, optional limit.
#[tauri::command]
pub fn get_play_history(
    limit: Option<i64>,
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<PlayRecord>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let query = match limit {
        Some(n) => format!("SELECT id, track_path, artist_name, track_title, album_name, played_at, duration_secs FROM play_history ORDER BY played_at DESC LIMIT {}", n),
        None => "SELECT id, track_path, artist_name, track_title, album_name, played_at, duration_secs FROM play_history ORDER BY played_at DESC".to_string(),
    };
    let mut stmt = conn.prepare(&query).map_err(|e| format!("Failed to prepare query: {}", e))?;
    let records = stmt.query_map([], |row| {
        Ok(PlayRecord {
            id: row.get(0)?,
            track_path: row.get(1)?,
            artist_name: row.get(2)?,
            track_title: row.get(3)?,
            album_name: row.get(4)?,
            played_at: row.get(5)?,
            duration_secs: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to query play history: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect play history: {}", e))?;
    Ok(records)
}

/// Delete a specific play record by id.
#[tauri::command]
pub fn delete_play(
    id: i64,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM play_history WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete play: {}", e))?;
    Ok(())
}

/// Clear all play history.
#[tauri::command]
pub fn clear_play_history(
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    conn.execute("DELETE FROM play_history", [])
        .map_err(|e| format!("Failed to clear play history: {}", e))?;
    Ok(())
}

/// Get total count of qualifying plays (used for activation gate).
#[tauri::command]
pub fn get_play_count(
    state: tauri::State<'_, TasteDbState>,
) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM play_history",
        [],
        |row| row.get(0),
    ).map_err(|e| format!("Failed to get play count: {}", e))?;
    Ok(count)
}

/// Export full play history as a JSON string (frontend saves to file).
#[tauri::command]
pub fn export_play_history(
    state: tauri::State<'_, TasteDbState>,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, track_path, artist_name, track_title, album_name, played_at, duration_secs FROM play_history ORDER BY played_at DESC"
    ).map_err(|e| format!("Failed to prepare export query: {}", e))?;
    let records = stmt.query_map([], |row| {
        Ok(PlayRecord {
            id: row.get(0)?,
            track_path: row.get(1)?,
            artist_name: row.get(2)?,
            track_title: row.get(3)?,
            album_name: row.get(4)?,
            played_at: row.get(5)?,
            duration_secs: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to query for export: {}", e))?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| format!("Failed to collect for export: {}", e))?;
    serde_json::to_string(&records).map_err(|e| format!("Failed to serialize history: {}", e))
}
