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
        .invoke_handler(tauri::generate_handler![check_database])
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
