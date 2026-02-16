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
        ])
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data = app.path().app_data_dir().expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data).ok();
            let conn = library::db::init_library_db(&app_data)
                .expect("failed to init library db");
            app.manage(scanner::LibraryState(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
