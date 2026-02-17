use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

/// Thread-safe wrapper for the taste.db connection, managed by Tauri.
pub struct TasteDbState(pub Mutex<Connection>);

/// Initialize taste.db — creates the database and all tables if they don't exist.
/// Returns a Connection for use as managed state.
pub fn init_taste_db(app_data_dir: &Path) -> Result<Connection, String> {
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
        ",
    )
    .map_err(|e| format!("Failed to create taste.db tables: {}", e))?;

    // Insert default ai_settings if not already present
    let defaults = [
        ("enabled", "false"),
        ("provider", "local"),
        ("api_key", ""),
        ("api_base_url", ""),
        ("api_model", ""),
        ("local_gen_model_status", "none"),
        ("local_embed_model_status", "none"),
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
