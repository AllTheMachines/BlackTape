use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::path::Path;

/// Lightweight cover record — one per album, used instead of embedding art in every track row.
#[derive(Clone, Debug, Serialize)]
pub struct AlbumCover {
    pub album: String,
    pub album_artist: Option<String>,
    pub cover_art_base64: Option<String>,
}

use crate::scanner::metadata::TrackMetadata;

#[derive(Clone, Debug, Serialize)]
pub struct LocalTrack {
    pub id: i64,
    pub path: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub duration_secs: f64,
    pub file_modified: i64,
    pub created_at: String,
    pub cover_art_base64: Option<String>,
    pub mb_tags: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct MusicFolder {
    pub id: i64,
    pub path: String,
    pub added_at: String,
}

pub fn init_library_db(app_data_dir: &Path) -> Result<Connection, String> {
    let db_path = app_data_dir.join("library.db");
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open library.db: {}", e))?;

    // Keep all temp tables in RAM — avoids disk-full errors when the system drive is low.
    // GROUP BY on cover_art_base64 (large blobs) would otherwise spill to C:\Temp.
    conn.execute_batch("PRAGMA temp_store = MEMORY;")
        .map_err(|e| format!("Failed to set temp_store: {}", e))?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS local_tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            title TEXT,
            artist TEXT,
            album TEXT,
            album_artist TEXT,
            track_number INTEGER,
            disc_number INTEGER,
            genre TEXT,
            year INTEGER,
            duration_secs REAL NOT NULL DEFAULT 0,
            file_modified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_local_tracks_artist ON local_tracks(artist);
        CREATE INDEX IF NOT EXISTS idx_local_tracks_album ON local_tracks(album);
        CREATE INDEX IF NOT EXISTS idx_local_tracks_path ON local_tracks(path);

        CREATE TABLE IF NOT EXISTS music_folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            added_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        ",
    )
    .map_err(|e| format!("Failed to create library tables: {}", e))?;

    // Migration: add cover_art_base64 column if it doesn't exist yet.
    let _ = conn.execute_batch("ALTER TABLE local_tracks ADD COLUMN cover_art_base64 TEXT;");
    // Migration: add mb_tags column for MusicBrainz genre tags.
    let _ = conn.execute_batch("ALTER TABLE local_tracks ADD COLUMN mb_tags TEXT;");

    // MusicBrainz lookup cache — avoids re-querying MB for the same album on every scan.
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS mb_album_cache (
            album TEXT NOT NULL,
            artist TEXT NOT NULL,
            mbid TEXT,
            looked_up_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (album, artist)
        );",
    )
    .map_err(|e| format!("Failed to create mb_album_cache: {}", e))?;

    Ok(conn)
}

pub fn insert_track(conn: &Connection, track: &TrackMetadata, file_modified: i64) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO local_tracks
            (path, title, artist, album, album_artist, track_number, disc_number, genre, year, duration_secs, file_modified, cover_art_base64)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            track.path,
            track.title,
            track.artist,
            track.album,
            track.album_artist,
            track.track_number,
            track.disc_number,
            track.genre,
            track.year,
            track.duration_secs,
            file_modified,
            track.cover_art_base64,
        ],
    )
    .map_err(|e| format!("Failed to insert track: {}", e))?;

    Ok(())
}

pub fn get_all_tracks(conn: &Connection) -> Result<Vec<LocalTrack>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, path, title, artist, album, album_artist, track_number, disc_number,
                    genre, year, duration_secs, file_modified, created_at, mb_tags
             FROM local_tracks
             ORDER BY album_artist, album, disc_number, track_number",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tracks = stmt
        .query_map([], |row| {
            Ok(LocalTrack {
                id: row.get(0)?,
                path: row.get(1)?,
                title: row.get(2)?,
                artist: row.get(3)?,
                album: row.get(4)?,
                album_artist: row.get(5)?,
                track_number: row.get::<_, Option<u32>>(6)?,
                disc_number: row.get::<_, Option<u32>>(7)?,
                genre: row.get(8)?,
                year: row.get::<_, Option<u32>>(9)?,
                duration_secs: row.get(10)?,
                file_modified: row.get(11)?,
                created_at: row.get(12)?,
                cover_art_base64: None,
                mb_tags: row.get(13)?,
            })
        })
        .map_err(|e| format!("Failed to query tracks: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect tracks: {}", e))?;

    Ok(tracks)
}

pub fn get_music_folders(conn: &Connection) -> Result<Vec<MusicFolder>, String> {
    let mut stmt = conn
        .prepare("SELECT id, path, added_at FROM music_folders ORDER BY added_at")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let folders = stmt
        .query_map([], |row| {
            Ok(MusicFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                added_at: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query music folders: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect music folders: {}", e))?;

    Ok(folders)
}

pub fn add_music_folder(conn: &Connection, path: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO music_folders (path) VALUES (?1)",
        params![path],
    )
    .map_err(|e| format!("Failed to add music folder: {}", e))?;

    Ok(())
}

/// Set cover art for all tracks belonging to an album.
/// Matches by album name and artist (album_artist or artist field).
pub fn set_album_cover(conn: &Connection, album: &str, artist: &str, cover: &str) -> Result<u32, String> {
    let n = conn
        .execute(
            "UPDATE local_tracks
             SET cover_art_base64 = ?1
             WHERE album = ?2
               AND (album_artist = ?3 OR (album_artist IS NULL AND artist = ?3))",
            params![cover, album, artist],
        )
        .map_err(|e| format!("Failed to set album cover: {}", e))?;
    Ok(n as u32)
}

/// Search tracks by title/artist/album — SQL-filtered, no cover art returned.
/// Used by the search page to avoid loading the entire library with cover blobs.
pub fn search_tracks(conn: &Connection, query: &str) -> Result<Vec<LocalTrack>, String> {
    let like = format!("%{}%", query.to_lowercase());
    let mut stmt = conn
        .prepare(
            "SELECT id, path, title, artist, album, album_artist, track_number, disc_number,
                    genre, year, duration_secs, file_modified, created_at, mb_tags
             FROM local_tracks
             WHERE LOWER(title) LIKE ?1 OR LOWER(artist) LIKE ?1 OR LOWER(album) LIKE ?1
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([&like], |row| {
            Ok(LocalTrack {
                id: row.get(0)?,
                path: row.get(1)?,
                title: row.get(2)?,
                artist: row.get(3)?,
                album: row.get(4)?,
                album_artist: row.get(5)?,
                track_number: row.get::<_, Option<u32>>(6)?,
                disc_number: row.get::<_, Option<u32>>(7)?,
                genre: row.get(8)?,
                year: row.get::<_, Option<u32>>(9)?,
                duration_secs: row.get(10)?,
                file_modified: row.get(11)?,
                created_at: row.get(12)?,
                cover_art_base64: None, // not needed for search results
                mb_tags: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

/// Get one cover per album — used by the library browser instead of per-track cover blobs.
pub fn get_album_covers(conn: &Connection) -> Result<Vec<AlbumCover>, String> {
    let mut stmt = conn
        .prepare(
            // Use bare cover_art_base64 in GROUP BY (SQLite returns an arbitrary value per group).
            // Avoids MIN() which forces SQLite to compare all blob values and create large temp files,
            // which fails with "disk full" on low-disk-space systems.
            "SELECT album, COALESCE(album_artist, artist), cover_art_base64
             FROM local_tracks
             WHERE cover_art_base64 IS NOT NULL
             GROUP BY album, COALESCE(album_artist, artist)",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok(AlbumCover {
                album: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                album_artist: row.get(1)?,
                cover_art_base64: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

/// Get cover art for a single album — used by the library browser for lazy per-album loading.
/// Returns None if the album has no cover art stored.
pub fn get_cover_for_album(conn: &Connection, album: &str, artist: &str) -> Result<Option<String>, String> {
    let result = conn
        .query_row(
            "SELECT cover_art_base64 FROM local_tracks
             WHERE album = ?1
               AND (album_artist = ?2 OR (album_artist IS NULL AND artist = ?2))
               AND cover_art_base64 IS NOT NULL
             LIMIT 1",
            params![album, artist],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

/// Get all unique (album, artist) pairs that need enrichment:
/// either missing cover art or missing genre tags, and not already in the MB cache.
pub fn get_albums_needing_enrichment(conn: &Connection) -> Result<Vec<(String, String)>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT lt.album, COALESCE(lt.album_artist, lt.artist)
             FROM local_tracks lt
             WHERE lt.album IS NOT NULL
               AND (lt.cover_art_base64 IS NULL OR lt.mb_tags IS NULL)
               AND NOT EXISTS (
                   SELECT 1 FROM mb_album_cache mc
                   WHERE mc.album = lt.album
                     AND mc.artist = COALESCE(lt.album_artist, lt.artist)
               )
             ORDER BY lt.album",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

/// Insert a MusicBrainz lookup result into the cache.
/// mbid is None if no match was found.
pub fn insert_mb_cache(conn: &Connection, album: &str, artist: &str, mbid: Option<&str>) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO mb_album_cache (album, artist, mbid) VALUES (?1, ?2, ?3)",
        params![album, artist, mbid],
    )
    .map_err(|e| format!("Failed to insert mb_album_cache: {}", e))?;
    Ok(())
}

/// Set MusicBrainz genre tags for all tracks in an album.
pub fn set_album_mb_tags(conn: &Connection, album: &str, artist: &str, tags: &str) -> Result<u32, String> {
    let n = conn
        .execute(
            "UPDATE local_tracks SET mb_tags = ?1
             WHERE album = ?2 AND (album_artist = ?3 OR (album_artist IS NULL AND artist = ?3))",
            params![tags, album, artist],
        )
        .map_err(|e| format!("Failed to set mb_tags: {}", e))?;
    Ok(n as u32)
}

pub fn remove_music_folder(conn: &Connection, path: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM music_folders WHERE path = ?1",
        params![path],
    )
    .map_err(|e| format!("Failed to remove music folder: {}", e))?;

    // Remove all tracks from this folder
    let like_pattern = format!("{}%", path);
    conn.execute(
        "DELETE FROM local_tracks WHERE path LIKE ?1",
        params![like_pattern],
    )
    .map_err(|e| format!("Failed to remove folder tracks: {}", e))?;

    Ok(())
}
