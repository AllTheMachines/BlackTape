use crate::ai::taste_db::TasteDbState;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedRelease {
    pub mbid: String,
    pub title: String,
    pub year: Option<i32>,
    pub release_type: String,
    pub fetched_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CachedTrack {
    pub track_mbid: String,
    pub release_group_mbid: String,
    pub title: String,
    pub track_number: Option<i32>,
    pub duration_ms: Option<i32>,
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

fn get_cached_releases(conn: &rusqlite::Connection, artist_mbid: &str) -> Result<Vec<CachedRelease>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT release_group_mbid, title, first_release_year, release_type, fetched_at
             FROM release_group_cache
             WHERE artist_mbid = ?
             ORDER BY first_release_year DESC NULLS LAST",
        )
        .map_err(|e| format!("Prepare: {}", e))?;

    let rows = stmt
        .query_map(params![artist_mbid], |row| {
            Ok(CachedRelease {
                mbid: row.get(0)?,
                title: row.get(1)?,
                year: row.get(2)?,
                release_type: row.get::<_, Option<String>>(3)?.unwrap_or_else(|| "Other".to_string()),
                fetched_at: row.get(4)?,
            })
        })
        .map_err(|e| format!("Query: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Row: {}", e))
}

// MB API response deserialization — release-groups endpoint
#[derive(Deserialize)]
struct MbReleasesResponse {
    #[serde(rename = "release-groups")]
    release_groups: Option<Vec<MbReleaseGroup>>,
}

#[derive(Deserialize)]
struct MbReleaseGroup {
    id: String,
    title: String,
    #[serde(rename = "first-release-date")]
    first_release_date: Option<String>,
    #[serde(rename = "primary-type")]
    primary_type: Option<String>,
}

// MB API response deserialization — release endpoint (recordings)
#[derive(Deserialize)]
struct MbReleaseListResponse {
    releases: Option<Vec<MbRelease>>,
}

#[derive(Deserialize)]
struct MbRelease {
    media: Option<Vec<MbMedium>>,
}

#[derive(Deserialize)]
struct MbMedium {
    tracks: Option<Vec<MbTrack>>,
}

#[derive(Deserialize)]
struct MbTrack {
    id: String,
    title: String,
    number: Option<String>,
    length: Option<i32>,
}

/// Fetch release-groups from MusicBrainz API and store in taste.db cache.
/// Also fetches top tracks for each release group (first release's recordings).
/// Returns cached results if available (cache-first strategy).
/// Rate limit: 1100ms sleep between per-release track fetches to respect MB 1 req/sec limit.
/// Concurrent invocations are not serialized — acceptable for single-artist-at-a-time navigation.
#[tauri::command]
pub async fn get_or_cache_releases(
    artist_mbid: String,
    state: tauri::State<'_, TasteDbState>,
) -> Result<Vec<CachedRelease>, String> {
    // 1. Check cache first
    let cached = {
        let conn = state.0.lock().map_err(|e| format!("Lock: {}", e))?;
        get_cached_releases(&conn, &artist_mbid)?
    };
    if !cached.is_empty() {
        return Ok(cached);
    }

    // 2. Cache miss — fetch release-groups from MB API
    let client = reqwest::Client::builder()
        .user_agent("BlackTape/0.3.0 (https://github.com/nicholasgasior/blacktape)")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client: {}", e))?;

    let rg_url = format!(
        "https://musicbrainz.org/ws/2/release-group?artist={}&type=album|single|ep&fmt=json&limit=100",
        artist_mbid
    );
    let resp = client
        .get(&rg_url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Fetch: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("MB API returned {}", resp.status()));
    }

    let mb_data: MbReleasesResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse: {}", e))?;

    let release_groups = mb_data.release_groups.unwrap_or_default();
    let now = now_unix();

    // 3. Store release-groups in cache
    {
        let conn = state.0.lock().map_err(|e| format!("Lock: {}", e))?;
        let mut insert_rg = conn
            .prepare(
                "INSERT OR REPLACE INTO release_group_cache
                 (artist_mbid, release_group_mbid, title, release_type, first_release_year, fetched_at)
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .map_err(|e| format!("Prepare insert rg: {}", e))?;

        for rg in &release_groups {
            let year: Option<i32> = rg
                .first_release_date
                .as_deref()
                .and_then(|d| d.get(..4))
                .and_then(|y| y.parse().ok());

            let release_type = match rg.primary_type.as_deref() {
                Some("Album") => "Album",
                Some("EP") => "EP",
                Some("Single") => "Single",
                _ => "Other",
            };

            insert_rg
                .execute(params![
                    artist_mbid,
                    rg.id,
                    rg.title,
                    release_type,
                    year,
                    now
                ])
                .map_err(|e| format!("Insert rg: {}", e))?;
        }
    }

    // 4. Fetch tracks for each release group (first release's recordings).
    //    MB endpoint: GET /ws/2/release?release-group={mbid}&inc=recordings&fmt=json&limit=1
    //    Rate limit: 1100ms sleep between requests to stay within MB 1 req/sec limit.
    //    An artist with N release groups takes ~N*1.1 seconds on first visit; subsequent visits instant.
    for rg in &release_groups {
        let track_url = format!(
            "https://musicbrainz.org/ws/2/release?release-group={}&inc=recordings&fmt=json&limit=1",
            rg.id
        );

        // Sleep 1100ms before each track fetch to respect MB 1 req/sec rate limit
        tokio::time::sleep(Duration::from_millis(1100)).await;

        let track_resp = match client
            .get(&track_url)
            .header("Accept", "application/json")
            .send()
            .await
        {
            Ok(r) if r.status().is_success() => r,
            Ok(r) => {
                // Non-success (e.g. 404 for release-group with no releases) — skip silently
                eprintln!("[track_cache] track fetch for {} returned {}", rg.id, r.status());
                continue;
            }
            Err(e) => {
                eprintln!("[track_cache] track fetch error for {}: {}", rg.id, e);
                continue;
            }
        };

        let release_list: MbReleaseListResponse = match track_resp.json().await {
            Ok(d) => d,
            Err(e) => {
                eprintln!("[track_cache] track parse error for {}: {}", rg.id, e);
                continue;
            }
        };

        // Flatten all tracks from all media in the first release
        let tracks: Vec<&MbTrack> = release_list
            .releases
            .as_deref()
            .unwrap_or_default()
            .iter()
            .flat_map(|r| r.media.as_deref().unwrap_or_default())
            .flat_map(|m| m.tracks.as_deref().unwrap_or_default())
            .collect();

        if tracks.is_empty() {
            continue;
        }

        let conn = state.0.lock().map_err(|e| format!("Lock: {}", e))?;
        let mut insert_track = conn
            .prepare(
                "INSERT OR REPLACE INTO release_track_cache
                 (release_group_mbid, track_mbid, title, track_number, duration_ms, fetched_at)
                 VALUES (?, ?, ?, ?, ?, ?)",
            )
            .map_err(|e| format!("Prepare insert track: {}", e))?;

        for track in &tracks {
            let track_number: Option<i32> = track
                .number
                .as_deref()
                .and_then(|n| n.parse().ok());

            insert_track
                .execute(params![
                    rg.id,
                    track.id,
                    track.title,
                    track_number,
                    track.length,
                    now
                ])
                .map_err(|e| format!("Insert track: {}", e))?;
        }
    }

    // 5. Return freshly cached release data
    let conn = state.0.lock().map_err(|e| format!("Lock: {}", e))?;
    get_cached_releases(&conn, &artist_mbid)
}
