mod ai;
mod library;
mod mercury_db;
mod scanner;
mod site_gen;

use tauri::Manager;

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
            scanner::scan_folder,
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
