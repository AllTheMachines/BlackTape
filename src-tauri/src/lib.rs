mod ai;
mod library;
mod scanner;

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
            ai::taste_db::get_detected_scenes,
            ai::taste_db::save_detected_scenes,
            ai::taste_db::follow_scene,
            ai::taste_db::unfollow_scene,
            ai::taste_db::get_scene_follows,
            ai::taste_db::suggest_scene_artist,
            ai::taste_db::get_scene_suggestions,
            ai::taste_db::upvote_feature_request,
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
