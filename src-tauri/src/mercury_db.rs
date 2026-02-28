/// Direct rusqlite commands for mercury.db queries.
/// Bypasses tauri-plugin-sql — avoids connection-open hangs in production builds.
///
/// Two types of commands:
/// - `query_mercury_db`: generic SQL passthrough (used by TauriProvider in TS)
/// - 4 specific commands (search_artists, etc.): typed, for direct invoke use

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Shared state — mercury.db connection held open for the app lifetime.
// Option<Connection> so the app starts gracefully even if mercury.db is absent.
// ---------------------------------------------------------------------------

pub struct MercuryDbState(pub std::sync::Mutex<Option<Connection>>);

pub fn init_mercury_db(app_data: &std::path::Path) -> Result<Connection, String> {
    let db_path = app_data.join("mercury.db");
    if !db_path.exists() {
        return Err(format!("mercury.db not found at {}", db_path.display()));
    }
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open mercury.db: {}", e))?;
    migrate_uniqueness_score(&conn);
    Ok(conn)
}

/// One-time migration: add precomputed uniqueness_score to artists table.
/// Safe to call on every startup — no-ops if column already exists.
/// Runs synchronously but only processes ~672K rows so finishes in ~5s.
fn migrate_uniqueness_score(conn: &Connection) {
    // Check if column exists
    let has_col: bool = conn
        .query_row(
            "SELECT COUNT(*) FROM pragma_table_info('artists') WHERE name='uniqueness_score'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0) > 0;

    if !has_col {
        // Add column
        if let Err(e) = conn.execute_batch(
            "ALTER TABLE artists ADD COLUMN uniqueness_score REAL DEFAULT 0;
             CREATE INDEX IF NOT EXISTS idx_artists_uniqueness ON artists(uniqueness_score DESC);",
        ) {
            eprintln!("[mercury_db] Failed to add uniqueness_score column: {}", e);
            return;
        }

        // Populate from artist_tags + tag_stats using a temp table for speed
        let sql = "
            CREATE TEMP TABLE _tmp_scores AS
              SELECT at.artist_id,
                     ROUND(COALESCE(AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000, 0), 4) AS score
              FROM artist_tags at
              LEFT JOIN tag_stats ts ON ts.tag = at.tag
              GROUP BY at.artist_id;
            CREATE INDEX _tmp_scores_idx ON _tmp_scores(artist_id);
            UPDATE artists
              SET uniqueness_score = (
                SELECT score FROM _tmp_scores WHERE artist_id = artists.id
              )
              WHERE id IN (SELECT artist_id FROM _tmp_scores);
            DROP TABLE _tmp_scores;
        ";
        if let Err(e) = conn.execute_batch(sql) {
            eprintln!("[mercury_db] Failed to populate uniqueness_score: {}", e);
        }
    }
}

// ---------------------------------------------------------------------------
// Types (mirror src/lib/db/queries.ts)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize)]
pub struct ArtistResult {
    pub id: i64,
    pub mbid: String,
    pub name: String,
    pub slug: String,
    pub country: Option<String>,
    pub tags: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Artist {
    pub id: i64,
    pub mbid: String,
    pub name: String,
    pub slug: String,
    #[serde(rename = "type")]
    pub artist_type: Option<String>,
    pub country: Option<String>,
    pub begin_year: Option<i64>,
    pub ended: Option<bool>,
    pub tags: Option<String>,
}

// ---------------------------------------------------------------------------
// Generic SQL passthrough — used by TauriProvider for all mercury.db queries
// ---------------------------------------------------------------------------

/// SQL parameter wrapper so serde_json::Value can be passed to rusqlite.
enum SqlParam {
    Null,
    Int(i64),
    Float(f64),
    Text(String),
}

impl rusqlite::ToSql for SqlParam {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        match self {
            SqlParam::Null => Ok(rusqlite::types::Null.into()),
            SqlParam::Int(i) => Ok((*i).into()),
            SqlParam::Float(f) => Ok((*f).into()),
            SqlParam::Text(s) => Ok(s.as_str().into()),
        }
    }
}

fn json_to_sql(v: serde_json::Value) -> SqlParam {
    match v {
        serde_json::Value::Null => SqlParam::Null,
        serde_json::Value::Bool(b) => SqlParam::Int(if b { 1 } else { 0 }),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                SqlParam::Int(i)
            } else if let Some(f) = n.as_f64() {
                SqlParam::Float(f)
            } else {
                SqlParam::Null
            }
        }
        serde_json::Value::String(s) => SqlParam::Text(s),
        _ => SqlParam::Null, // arrays/objects can't be SQL params
    }
}

fn rusqlite_to_json(val: rusqlite::types::Value) -> serde_json::Value {
    match val {
        rusqlite::types::Value::Null => serde_json::Value::Null,
        rusqlite::types::Value::Integer(i) => serde_json::json!(i),
        rusqlite::types::Value::Real(f) => serde_json::json!(f),
        rusqlite::types::Value::Text(s) => serde_json::json!(s),
        rusqlite::types::Value::Blob(b) => serde_json::json!(b),
    }
}

/// Execute arbitrary SQL against mercury.db and return rows as JSON objects.
/// Called by TauriProvider in TypeScript to proxy all mercury.db queries.
#[tauri::command]
pub fn query_mercury_db(
    sql: String,
    params: Vec<serde_json::Value>,
    state: tauri::State<'_, MercuryDbState>,
) -> Result<Vec<serde_json::Value>, String> {
    let guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let conn = guard.as_ref().ok_or_else(|| "mercury.db not available".to_string())?;

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let col_count = stmt.column_count();
    let col_names: Vec<String> = (0..col_count)
        .map(|i| stmt.column_name(i).unwrap_or("col").to_string())
        .collect();

    let sql_params: Vec<SqlParam> = params.into_iter().map(json_to_sql).collect();

    let rows = stmt
        .query_map(rusqlite::params_from_iter(sql_params.iter()), |row| {
            let mut obj = serde_json::Map::new();
            for (i, name) in col_names.iter().enumerate() {
                let val: rusqlite::types::Value = row.get(i)?;
                obj.insert(name.clone(), rusqlite_to_json(val));
            }
            Ok(serde_json::Value::Object(obj))
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Specific typed commands (for direct invoke from TS if preferred)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn search_artists(
    query: String,
    state: tauri::State<'_, MercuryDbState>,
) -> Result<Vec<ArtistResult>, String> {
    let guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let conn = guard.as_ref().ok_or_else(|| "mercury.db not available".to_string())?;
    let lower = query.to_lowercase();
    let like_pat = format!("%{}%", query);
    let starts_pat = format!("{}%", lower);

    // Try FTS5 first, fall back to LIKE
    let fts_query = sanitize_fts(&query);
    if !fts_query.is_empty() {
        let mut stmt = conn.prepare(
            "SELECT a.id, a.mbid, a.name, a.slug, a.country,
                    (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
             FROM artists_fts f
             JOIN artists a ON a.id = f.rowid
             WHERE artists_fts MATCH ?1
             ORDER BY
               CASE
                 WHEN LOWER(a.name) = ?2 THEN 0
                 WHEN LOWER(a.name) LIKE ?3 THEN 1
                 ELSE 2
               END,
               f.rank
             LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![fts_query, lower, starts_pat], |row| {
            Ok(ArtistResult {
                id: row.get(0)?,
                mbid: row.get(1)?,
                name: row.get(2)?,
                slug: row.get(3)?,
                country: row.get(4)?,
                tags: row.get(5)?,
            })
        }).map_err(|e| e.to_string())?;

        let results: Result<Vec<_>, _> = rows.collect();
        return results.map_err(|e| e.to_string());
    }

    // LIKE fallback
    let mut stmt = conn.prepare(
        "SELECT a.id, a.mbid, a.name, a.slug, a.country,
                GROUP_CONCAT(at2.tag, ', ') AS tags
         FROM artists a
         LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
         WHERE a.name LIKE ?1
         GROUP BY a.id
         ORDER BY
           CASE
             WHEN LOWER(a.name) = ?2 THEN 0
             WHEN LOWER(a.name) LIKE ?3 THEN 1
             ELSE 2
           END,
           a.name
         LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![like_pat, lower, starts_pat], |row| {
        Ok(ArtistResult {
            id: row.get(0)?,
            mbid: row.get(1)?,
            name: row.get(2)?,
            slug: row.get(3)?,
            country: row.get(4)?,
            tags: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let results: Result<Vec<_>, _> = rows.collect();
    results.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_by_tag(
    tag: String,
    state: tauri::State<'_, MercuryDbState>,
) -> Result<Vec<ArtistResult>, String> {
    let guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let conn = guard.as_ref().ok_or_else(|| "mercury.db not available".to_string())?;
    let normalized = tag.to_lowercase();

    let mut stmt = conn.prepare(
        "SELECT a.id, a.mbid, a.name, a.slug, a.country,
                GROUP_CONCAT(at_all.tag, ', ') AS tags
         FROM artist_tags at1
         JOIN artists a ON a.id = at1.artist_id
         LEFT JOIN artist_tags at_all ON at_all.artist_id = a.id
         WHERE at1.tag = ?1
         GROUP BY a.id
         ORDER BY at1.count DESC
         LIMIT 50"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![normalized], |row| {
        Ok(ArtistResult {
            id: row.get(0)?,
            mbid: row.get(1)?,
            name: row.get(2)?,
            slug: row.get(3)?,
            country: row.get(4)?,
            tags: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    let results: Result<Vec<_>, _> = rows.collect();
    results.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_artist_by_slug(
    slug: String,
    state: tauri::State<'_, MercuryDbState>,
) -> Result<Option<Artist>, String> {
    let guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let conn = guard.as_ref().ok_or_else(|| "mercury.db not available".to_string())?;

    let result = conn.query_row(
        "SELECT a.id, a.mbid, a.name, a.slug, a.type, a.country,
                a.begin_year, a.ended,
                GROUP_CONCAT(at2.tag, ', ') AS tags
         FROM artists a
         LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
         WHERE a.slug = ?1
         GROUP BY a.id",
        params![slug],
        |row| Ok(Artist {
            id: row.get(0)?,
            mbid: row.get(1)?,
            name: row.get(2)?,
            slug: row.get(3)?,
            artist_type: row.get(4)?,
            country: row.get(5)?,
            begin_year: row.get(6)?,
            ended: row.get(7)?,
            tags: row.get(8)?,
        }),
    );

    match result {
        Ok(artist) => Ok(Some(artist)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn get_popular_tags(
    limit: Option<i64>,
    state: tauri::State<'_, MercuryDbState>,
) -> Result<Vec<serde_json::Value>, String> {
    let guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let conn = guard.as_ref().ok_or_else(|| "mercury.db not available".to_string())?;
    let lim = limit.unwrap_or(100);

    let mut stmt = conn.prepare(
        "SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT ?1"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![lim], |row| {
        Ok(serde_json::json!({
            "tag": row.get::<_, String>(0)?,
            "artist_count": row.get::<_, i64>(1)?
        }))
    }).map_err(|e| e.to_string())?;

    let results: Result<Vec<_>, _> = rows.collect();
    results.map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Mirror of sanitizeFtsQuery from queries.ts — strips chars that break FTS5.
fn sanitize_fts(query: &str) -> String {
    let cleaned: String = query.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '\'')
        .collect();
    let trimmed = cleaned.trim().to_string();
    if trimmed.is_empty() {
        return String::new();
    }
    // Wrap each word in quotes so FTS5 treats them as prefix tokens
    let terms: Vec<String> = trimmed
        .split_whitespace()
        .map(|w| format!("\"{}\"*", w))
        .collect();
    terms.join(" ")
}

// ---------------------------------------------------------------------------
// RUST-01: Unit tests for sanitize_fts
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::sanitize_fts;

    #[test]
    fn empty_input_returns_empty() {
        assert_eq!(sanitize_fts(""), "");
    }

    #[test]
    fn whitespace_only_returns_empty() {
        assert_eq!(sanitize_fts("   "), "");
    }

    #[test]
    fn single_word_wrapped_as_prefix_token() {
        assert_eq!(sanitize_fts("radiohead"), "\"radiohead\"*");
    }

    #[test]
    fn multi_word_each_wrapped_separately() {
        assert_eq!(sanitize_fts("aphex twin"), "\"aphex\"* \"twin\"*");
    }

    #[test]
    fn special_chars_stripped_not_spaced() {
        // +, (, ), * removed — adjacent chars join without a space
        assert_eq!(sanitize_fts("(test)"), "\"test\"*");
        // + is stripped so "aphex+twin" becomes "aphextwin"
        assert_eq!(sanitize_fts("aphex+twin"), "\"aphextwin\"*");
    }

    #[test]
    fn hyphens_preserved() {
        let result = sanitize_fts("post-rock");
        assert!(result.contains("post-rock"), "expected hyphen preserved, got: {}", result);
    }

    #[test]
    fn apostrophes_preserved() {
        let result = sanitize_fts("o'malley");
        assert!(result.contains("o'malley"), "expected apostrophe preserved, got: {}", result);
    }

    #[test]
    fn fts5_operators_neutralized_by_quoting() {
        // "OR" keyword should become a quoted literal, not an FTS5 operator
        let result = sanitize_fts("OR");
        assert_eq!(result, "\"OR\"*");
    }

    #[test]
    fn leading_and_trailing_spaces_trimmed() {
        assert_eq!(sanitize_fts("  boards  "), "\"boards\"*");
    }
}
