mod activitypub;
mod ai;
mod export;
mod library;
mod mercury_db;
mod scanner;
mod secrets;
mod site_gen;
mod updater;

use tauri::Manager;
use tauri::ipc::Channel;
use serde::Serialize;
use futures_util::StreamExt;

/// Match a list of artist names against the mercury.db catalog.
/// Returns a list of MatchResult with MBID and slug if found.
#[tauri::command]
fn match_artists_batch(
    names: Vec<String>,
    app: tauri::AppHandle,
) -> Result<Vec<ai::taste_db::MatchResult>, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("mercury.db");
    let conn = rusqlite::Connection::open(&db_path)
        .map_err(|e| format!("Failed to open mercury.db: {}", e))?;

    let mut results = Vec::new();
    for name in names {
        let result = conn.query_row(
            "SELECT mbid, slug FROM artists WHERE LOWER(name) = LOWER(?1) LIMIT 1",
            rusqlite::params![name],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        );
        match result {
            Ok((mbid, slug)) => results.push(ai::taste_db::MatchResult {
                name,
                artist_mbid: Some(mbid),
                artist_slug: Some(slug),
            }),
            Err(rusqlite::Error::QueryReturnedNoRows) => results.push(ai::taste_db::MatchResult {
                name,
                artist_mbid: None,
                artist_slug: None,
            }),
            Err(e) => return Err(format!("DB query error: {}", e)),
        }
    }
    Ok(results)
}

#[tauri::command]
fn check_database(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("mercury.db");
    Ok(serde_json::json!({
        "exists": db_path.exists(),
        "path": db_path.to_string_lossy(),
        "dir": app_data.to_string_lossy()
    }))
}

/// Progress payload for database download + decompression.
#[derive(Clone, Serialize)]
struct DbDownloadProgress {
    phase: String,
    downloaded: u64,
    total: u64,
}

/// Download mercury.db.gz from a URL, decompress it, and place mercury.db in app data dir.
/// Reports progress via Tauri Channel in two phases: "downloading" and "decompressing".
#[tauri::command]
async fn download_database(
    app: tauri::AppHandle,
    url: String,
    on_progress: Channel<DbDownloadProgress>,
) -> Result<String, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    let db_path = app_data.join("mercury.db");

    // If the database already exists, return immediately
    if db_path.exists() {
        return Ok(db_path.to_string_lossy().to_string());
    }

    let gz_temp = app_data.join("mercury.db.gz.downloading");
    let gz_path = app_data.join("mercury.db.gz");
    let db_temp = app_data.join("mercury.db.downloading");

    // Phase 1: Download the .gz file with streaming progress
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut last_reported: u64 = 0;

    let mut file = std::fs::File::create(&gz_temp)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Error reading download stream: {}", e))?;
        std::io::Write::write_all(&mut file, &chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;
        downloaded += chunk.len() as u64;

        // Report every ~512KB
        if downloaded - last_reported >= 524_288 || downloaded == total {
            let _ = on_progress.send(DbDownloadProgress {
                phase: "downloading".into(),
                downloaded,
                total,
            });
            last_reported = downloaded;
        }
    }

    std::io::Write::flush(&mut file).map_err(|e| format!("Failed to flush file: {}", e))?;
    drop(file);
    std::fs::rename(&gz_temp, &gz_path)
        .map_err(|e| format!("Failed to finalize gz download: {}", e))?;

    // Phase 2: Decompress .gz → mercury.db
    let _ = on_progress.send(DbDownloadProgress {
        phase: "decompressing".into(),
        downloaded: 0,
        total: 0,
    });

    // Run decompression in a blocking thread to avoid blocking the async runtime
    let gz_path_clone = gz_path.clone();
    let db_temp_clone = db_temp.clone();
    let on_progress_clone = on_progress.clone();
    let decompress_result = tauri::async_runtime::spawn_blocking(move || {
        let gz_file = std::fs::File::open(&gz_path_clone)
            .map_err(|e| format!("Failed to open gz file: {}", e))?;
        let mut decoder = flate2::read::GzDecoder::new(std::io::BufReader::new(gz_file));
        let mut out_file = std::fs::File::create(&db_temp_clone)
            .map_err(|e| format!("Failed to create output file: {}", e))?;

        let mut buf = [0u8; 1_048_576]; // 1MB buffer
        let mut written: u64 = 0;
        let mut last_reported: u64 = 0;
        loop {
            let n = std::io::Read::read(&mut decoder, &mut buf)
                .map_err(|e| format!("Decompression error: {}", e))?;
            if n == 0 {
                break;
            }
            std::io::Write::write_all(&mut out_file, &buf[..n])
                .map_err(|e| format!("Failed to write decompressed data: {}", e))?;
            written += n as u64;
            if written - last_reported >= 10_485_760 {
                let _ = on_progress_clone.send(DbDownloadProgress {
                    phase: "decompressing".into(),
                    downloaded: written,
                    total: 0,
                });
                last_reported = written;
            }
        }
        std::io::Write::flush(&mut out_file)
            .map_err(|e| format!("Failed to flush output: {}", e))?;
        Ok::<u64, String>(written)
    })
    .await
    .map_err(|e| format!("Decompress task failed: {}", e))?;

    decompress_result?;

    // Move decompressed db to final location
    std::fs::rename(&db_temp, &db_path)
        .map_err(|e| format!("Failed to finalize database: {}", e))?;

    // Clean up the .gz file
    let _ = std::fs::remove_file(&gz_path);

    Ok(db_path.to_string_lossy().to_string())
}

pub fn run() {
    tauri::Builder::default()
        // Override the built-in tauri:// protocol to intercept missing __data.json requests.
        // SvelteKit's client router fetches /route/__data.json for every server-load route.
        // For dynamic paths (e.g. /artist/[slug]) that aren't pre-rendered, Tauri's default
        // handler falls back to index.html — SvelteKit then crashes on JSON.parse('<DOCTYPE...').
        // We intercept those requests and return an empty-data JSON that SvelteKit accepts.
        .register_uri_scheme_protocol("tauri", |ctx, request| {
            let path = request.uri().path().to_string();
            let resolver = ctx.app_handle().asset_resolver();

            if let Some(asset) = resolver.get(path.clone()) {
                // Detect when a __data.json request fell back to index.html (the SPA fallback).
                // The embedded index.html has mime_type text/html; real __data.json has application/json.
                if path.ends_with("__data.json") && asset.mime_type.contains("text/html") {
                    return tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", "application/json")
                        .header("Access-Control-Allow-Origin", "*")
                        .body(br#"{"type":"data","nodes":[null,{"type":"skip"}]}"#.to_vec())
                        .unwrap();
                }

                let mut builder = tauri::http::Response::builder()
                    .status(200)
                    .header("Content-Type", &asset.mime_type)
                    .header("Access-Control-Allow-Origin", "*");
                if let Some(csp) = asset.csp_header {
                    builder = builder.header("Content-Security-Policy", csp);
                }
                builder.body(asset.bytes).unwrap()
            } else {
                // File not found (in dev mode, asset_resolver reads from disk without fallbacks).
                // Still intercept __data.json so dev builds don't crash either.
                if path.ends_with("__data.json") {
                    tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", "application/json")
                        .header("Access-Control-Allow-Origin", "*")
                        .body(br#"{"type":"data","nodes":[null,{"type":"skip"}]}"#.to_vec())
                        .unwrap()
                } else {
                    tauri::http::Response::builder()
                        .status(404)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(b"Not Found".to_vec())
                        .unwrap()
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            check_database,
            download_database,
            scanner::scan_folder,
            scanner::search_local_tracks,
            scanner::get_album_covers,
            scanner::get_cover_for_album,
            scanner::set_album_cover,
            scanner::refresh_covers,
            scanner::get_library_tracks,
            scanner::get_music_folders,
            scanner::add_music_folder,
            scanner::remove_music_folder,
            ai::sidecar::start_generation_server,
            ai::sidecar::start_embedding_server,
            ai::sidecar::stop_ai_servers,
            ai::sidecar::get_ai_status,
            ai::taste_db::get_ai_setting,
            ai::taste_db::set_ai_setting,
            ai::taste_db::get_all_ai_settings,
            ai::download::download_model,
            ai::download::check_model_exists,
            ai::download::get_models_dir,
            ai::embeddings::store_embedding,
            ai::embeddings::find_similar_artists,
            ai::embeddings::get_embedding,
            ai::embeddings::has_embedding,
            ai::taste_db::add_favorite_artist,
            ai::taste_db::remove_favorite_artist,
            ai::taste_db::get_favorite_artists,
            ai::taste_db::is_favorite_artist,
            ai::taste_db::get_taste_tags,
            ai::taste_db::set_taste_tag,
            ai::taste_db::remove_taste_tag,
            ai::taste_db::get_taste_anchors,
            ai::taste_db::add_taste_anchor,
            ai::taste_db::remove_taste_anchor,
            ai::taste_db::record_play,
            ai::taste_db::get_play_history,
            ai::taste_db::delete_play,
            ai::taste_db::clear_play_history,
            ai::taste_db::get_play_count,
            ai::taste_db::export_play_history,
            ai::taste_db::get_identity_value,
            ai::taste_db::set_identity_value,
            ai::taste_db::get_all_identity,
            ai::taste_db::get_collections,
            ai::taste_db::create_collection,
            ai::taste_db::delete_collection,
            ai::taste_db::rename_collection,
            ai::taste_db::get_collection_items,
            ai::taste_db::add_collection_item,
            ai::taste_db::remove_collection_item,
            ai::taste_db::is_in_collection,
            ai::taste_db::get_all_collection_items,
            ai::taste_db::save_base64_to_file,
            ai::taste_db::write_json_to_path,
            ai::taste_db::export_play_history_to_path,
            match_artists_batch,
            mercury_db::query_mercury_db,
            mercury_db::search_artists,
            mercury_db::search_by_tag,
            mercury_db::get_artist_by_slug,
            mercury_db::get_popular_tags,
            ai::taste_db::get_detected_scenes,
            ai::taste_db::save_detected_scenes,
            ai::taste_db::follow_scene,
            ai::taste_db::unfollow_scene,
            ai::taste_db::get_scene_follows,
            ai::taste_db::suggest_scene_artist,
            ai::taste_db::get_scene_suggestions,
            ai::taste_db::upvote_feature_request,
            ai::taste_db::record_artist_visit,
            ai::taste_db::get_artist_summary,
            ai::taste_db::save_artist_summary,
            site_gen::generate_artist_site,
            site_gen::open_in_explorer,
            activitypub::export_activitypub,
            secrets::get_secret,
            secrets::set_secret,
            secrets::delete_secret,
            updater::check_for_update,
            updater::install_update,
            updater::get_app_version,
            export::export_queue_m3u,
            export::export_queue_nml,
            export::copy_tracks_to_folder,
        ])
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_oauth::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data).ok();
            let conn = library::db::init_library_db(&app_data)
                .expect("failed to init library db");
            app.manage(scanner::LibraryState(std::sync::Mutex::new(conn)));

            // Initialize mercury.db for catalog search queries (graceful — may not exist yet)
            let mercury_conn = mercury_db::init_mercury_db(&app_data).ok();
            app.manage(mercury_db::MercuryDbState(std::sync::Mutex::new(mercury_conn)));

            // Initialize taste.db for AI settings and taste profile
            let taste_conn = ai::taste_db::init_taste_db(&app_data)
                .expect("failed to init taste db");

            // Migrate any plaintext secrets from taste.db to OS credential store (one-shot).
            secrets::migrate_plaintext_secrets(&taste_conn);

            app.manage(ai::taste_db::TasteDbState(std::sync::Mutex::new(taste_conn)));

            // Initialize AI sidecar state
            app.manage(ai::sidecar::SidecarState(std::sync::Mutex::new(
                ai::sidecar::AiSidecarState::default(),
            )));

            // Clean up any orphaned llama-server processes from a previous crash
            ai::sidecar::cleanup_orphaned_servers(&app_data);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ---------------------------------------------------------------------------
// RUST-02: Unit tests for __data.json protocol handler logic
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    /// Mirrors the __data.json fallback detection logic from the URI scheme handler.
    /// Returns true when a __data.json request resolved to the HTML index fallback,
    /// meaning the real JSON data file doesn't exist (dynamic route not pre-rendered).
    fn is_data_json_fallback(path: &str, mime_type: &str) -> bool {
        path.ends_with("__data.json") && mime_type.contains("text/html")
    }

    #[test]
    fn detects_html_fallback_for_data_json() {
        assert!(is_data_json_fallback("/route/__data.json", "text/html"));
        assert!(is_data_json_fallback(
            "/artist/radiohead/__data.json",
            "text/html; charset=utf-8"
        ));
    }

    #[test]
    fn ignores_non_data_json_paths() {
        assert!(!is_data_json_fallback("/index.html", "text/html"));
        assert!(!is_data_json_fallback("/app.css", "text/css"));
        assert!(!is_data_json_fallback("/", "text/html"));
    }

    #[test]
    fn ignores_real_json_responses() {
        // If the asset resolver returns application/json, it's the real data file
        assert!(!is_data_json_fallback("/route/__data.json", "application/json"));
    }

    #[test]
    fn empty_data_json_body_is_valid_sveltekit_skip_format() {
        // Verify the constant empty-data body is valid JSON in SvelteKit's expected format.
        // SvelteKit client accepts {"type":"data","nodes":[null,{"type":"skip"}]} as a
        // no-op server load — prevents JSON.parse crash on the index.html fallback.
        let body = br#"{"type":"data","nodes":[null,{"type":"skip"}]}"#;
        let parsed: serde_json::Value = serde_json::from_slice(body)
            .expect("empty data body must be valid JSON");
        assert_eq!(parsed["type"], "data");
        assert!(parsed["nodes"].is_array());
        assert!(parsed["nodes"][1]["type"] == "skip");
    }
}
