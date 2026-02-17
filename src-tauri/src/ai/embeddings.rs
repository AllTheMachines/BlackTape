use rusqlite::params;
use serde::Serialize;
use zerocopy::IntoBytes;

use super::taste_db::TasteDbState;

/// Register the sqlite-vec extension as an auto-extension.
/// Must be called BEFORE opening any database connections that use vec0 tables.
pub fn register_vec_extension() {
    unsafe {
        rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
            sqlite_vec::sqlite3_vec_init as *const (),
        )));
    }
}

/// Create the vec0 virtual table and mapping table for artist embeddings.
/// Called after the base taste.db tables are created.
pub fn create_embedding_tables(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS artist_embeddings USING vec0(
            embedding float[768]
        );

        CREATE TABLE IF NOT EXISTS artist_embedding_map (
            rowid INTEGER PRIMARY KEY,
            artist_mbid TEXT NOT NULL UNIQUE,
            artist_name TEXT NOT NULL,
            embedded_at INTEGER NOT NULL
        );
        ",
    )
    .map_err(|e| format!("Failed to create embedding tables: {}", e))?;

    Ok(())
}

#[derive(Debug, Serialize)]
pub struct SimilarArtist {
    pub artist_mbid: String,
    pub artist_name: String,
    pub distance: f64,
}

/// Store an embedding for an artist. If the artist already has an embedding,
/// it will be updated. Uses a transaction for atomicity.
#[tauri::command]
pub fn store_embedding(
    artist_mbid: String,
    artist_name: String,
    embedding: Vec<f32>,
    state: tauri::State<'_, TasteDbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let embedding_bytes = embedding.as_bytes();

    let tx = conn
        .unchecked_transaction()
        .map_err(|e| format!("Transaction error: {}", e))?;

    // Check if artist already has an embedding
    let existing_rowid: Option<i64> = tx
        .query_row(
            "SELECT rowid FROM artist_embedding_map WHERE artist_mbid = ?1",
            params![artist_mbid],
            |row| row.get(0),
        )
        .ok();

    if let Some(rowid) = existing_rowid {
        // Update existing embedding
        tx.execute(
            "UPDATE artist_embeddings SET embedding = ?1 WHERE rowid = ?2",
            params![embedding_bytes, rowid],
        )
        .map_err(|e| format!("Failed to update embedding: {}", e))?;

        tx.execute(
            "UPDATE artist_embedding_map SET artist_name = ?1, embedded_at = ?2 WHERE rowid = ?3",
            params![artist_name, now, rowid],
        )
        .map_err(|e| format!("Failed to update embedding map: {}", e))?;
    } else {
        // Insert new embedding into vec0 table
        tx.execute(
            "INSERT INTO artist_embeddings (embedding) VALUES (?1)",
            params![embedding_bytes],
        )
        .map_err(|e| format!("Failed to insert embedding: {}", e))?;

        let new_rowid = tx.last_insert_rowid();

        // Insert mapping row with matching rowid
        tx.execute(
            "INSERT INTO artist_embedding_map (rowid, artist_mbid, artist_name, embedded_at) VALUES (?1, ?2, ?3, ?4)",
            params![new_rowid, artist_mbid, artist_name, now],
        )
        .map_err(|e| format!("Failed to insert embedding map: {}", e))?;
    }

    tx.commit()
        .map_err(|e| format!("Commit error: {}", e))?;

    Ok(())
}

/// Find similar artists by embedding vector similarity.
/// Returns the closest matches ordered by distance (ascending).
#[tauri::command]
pub fn find_similar_artists(
    embedding: Vec<f32>,
    limit: usize,
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<SimilarArtist>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let embedding_bytes = embedding.as_bytes();

    let mut stmt = conn
        .prepare(
            "SELECT aem.artist_mbid, aem.artist_name, ae.distance
             FROM artist_embeddings ae
             JOIN artist_embedding_map aem ON aem.rowid = ae.rowid
             WHERE embedding MATCH ?1
             ORDER BY distance
             LIMIT ?2",
        )
        .map_err(|e| format!("Failed to prepare similarity query: {}", e))?;

    let results = stmt
        .query_map(params![embedding_bytes, limit as i64], |row| {
            Ok(SimilarArtist {
                artist_mbid: row.get(0)?,
                artist_name: row.get(1)?,
                distance: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query similar artists: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect results: {}", e))?;

    Ok(results)
}

/// Get the embedding vector for a specific artist by MBID.
#[tauri::command]
pub fn get_embedding(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<Option<Vec<f32>>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let rowid: Option<i64> = conn
        .query_row(
            "SELECT rowid FROM artist_embedding_map WHERE artist_mbid = ?1",
            params![artist_mbid],
            |row| row.get(0),
        )
        .ok();

    let Some(rowid) = rowid else {
        return Ok(None);
    };

    let embedding_blob: Vec<u8> = conn
        .query_row(
            "SELECT embedding FROM artist_embeddings WHERE rowid = ?1",
            params![rowid],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to get embedding: {}", e))?;

    // Convert bytes back to Vec<f32>
    let floats: Vec<f32> = embedding_blob
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect();

    Ok(Some(floats))
}

/// Check if an artist has a stored embedding.
#[tauri::command]
pub fn has_embedding(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM artist_embedding_map WHERE artist_mbid = ?1)",
            params![artist_mbid],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check embedding: {}", e))?;

    Ok(exists)
}
