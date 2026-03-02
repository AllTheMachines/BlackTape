use crate::library::db;
use crate::scanner::LibraryState;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::ipc::Channel;

#[derive(Clone, Debug, Serialize)]
pub struct EnrichProgress {
    pub enriched: u32,
    pub total: u32,
    pub current_album: String,
    pub current_artist: String,
    pub found_cover: bool,
}

#[derive(Deserialize)]
struct MbSearchResponse {
    #[serde(rename = "release-groups")]
    release_groups: Option<Vec<MbReleaseGroup>>,
}

#[derive(Deserialize)]
struct MbReleaseGroup {
    id: String,
    #[serde(default)]
    tags: Vec<MbTag>,
}

#[derive(Deserialize)]
struct MbTag {
    name: String,
    #[serde(default)]
    count: i32,
}

/// Enrich library albums by looking up cover art from MusicBrainz + Cover Art Archive.
/// Skips albums already in the mb_album_cache.
/// Returns the number of albums that got cover art.
#[tauri::command]
pub async fn enrich_library(
    on_progress: Channel<EnrichProgress>,
    state: tauri::State<'_, LibraryState>,
) -> Result<u32, String> {
    // Collect albums needing enrichment while holding the lock briefly
    let albums = {
        let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
        db::get_albums_needing_enrichment(&conn)?
    };

    let total = albums.len() as u32;
    if total == 0 {
        return Ok(0);
    }

    let client = reqwest::Client::builder()
        .user_agent("BlackTape/0.3.0 (https://github.com/nicholasgasior/blacktape)")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let mut enriched: u32 = 0;
    let mut found_count: u32 = 0;

    for (album, artist) in &albums {
        enriched += 1;

        // 1) Search MusicBrainz for a release-group matching album + artist
        let mb_url = format!(
            "https://musicbrainz.org/ws/2/release-group?query=releasegroup:\"{}\" AND artist:\"{}\"&limit=1&fmt=json",
            mb_encode(album),
            mb_encode(artist),
        );

        let (mbid, mb_tags) = match client.get(&mb_url).send().await {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<MbSearchResponse>().await {
                    Ok(data) => {
                        if let Some(rg) = data.release_groups.and_then(|rgs: Vec<MbReleaseGroup>| rgs.into_iter().next()) {
                            // Take top tags sorted by vote count
                            let mut tags = rg.tags;
                            tags.sort_by(|a, b| b.count.cmp(&a.count));
                            let tag_str: Vec<String> = tags.into_iter().take(10).map(|t| t.name).collect();
                            (Some(rg.id), if tag_str.is_empty() { None } else { Some(tag_str.join("; ")) })
                        } else {
                            (None, None)
                        }
                    }
                    Err(_) => (None, None),
                }
            }
            _ => (None, None),
        };

        // Rate limit: 1 request per second (MusicBrainz policy)
        tokio::time::sleep(Duration::from_millis(1100)).await;

        let mut got_cover = false;

        if let Some(ref mbid) = mbid {
            // 2) Fetch cover from Cover Art Archive (250px front thumbnail)
            let caa_url = format!(
                "https://coverartarchive.org/release-group/{}/front-250",
                mbid
            );

            if let Ok(resp) = client.get(&caa_url).send().await {
                if resp.status().is_success() {
                    if let Ok(bytes) = resp.bytes().await {
                        // Convert to base64 data URL
                        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                        // Detect MIME from first bytes (JPEG vs PNG)
                        let mime = if bytes.starts_with(&[0xFF, 0xD8]) {
                            "image/jpeg"
                        } else if bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
                            "image/png"
                        } else {
                            "image/jpeg"
                        };
                        let data_url = format!("data:{};base64,{}", mime, b64);

                        // Store cover in DB for all tracks in this album
                        let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
                        let _ = db::set_album_cover(&conn, album, artist, &data_url);
                        got_cover = true;
                        found_count += 1;
                    }
                }
            }

            // Rate limit after CAA request too
            tokio::time::sleep(Duration::from_millis(1100)).await;
        }

        // 3) Store MB tags on tracks if we got any
        if let Some(ref tags) = mb_tags {
            let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
            let _ = db::set_album_mb_tags(&conn, album, artist, tags);
        }

        // 4) Cache the lookup result (even if no match — avoids re-querying)
        {
            let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
            let _ = db::insert_mb_cache(&conn, album, artist, mbid.as_deref());
        }

        // Report progress
        let _ = on_progress.send(EnrichProgress {
            enriched,
            total,
            current_album: album.clone(),
            current_artist: artist.clone(),
            found_cover: got_cover,
        });
    }

    Ok(found_count)
}

/// Encode a string for use in MusicBrainz Lucene query syntax.
/// Escapes special characters that would break the query.
fn mb_encode(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace(':', "\\:")
        .replace('(', "\\(")
        .replace(')', "\\)")
        .replace('[', "\\[")
        .replace(']', "\\]")
        .replace('{', "\\{")
        .replace('}', "\\}")
        .replace('+', "\\+")
        .replace('-', "\\-")
        .replace('!', "\\!")
        .replace('~', "\\~")
        .replace('^', "\\^")
}
