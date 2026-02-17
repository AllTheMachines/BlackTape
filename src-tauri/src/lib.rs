mod ai;
mod library;
mod scanner;

use tauri::Manager;

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
        ])
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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
