use futures_util::StreamExt;
use serde::Serialize;
use std::io::Write;
use tauri::ipc::Channel;
use tauri::Manager;

/// Progress payload sent to the frontend via Tauri Channel.
#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
}

/// Download a model file from a URL to the app's models directory.
/// Reports progress via Tauri Channel (same pattern as scanner progress).
#[tauri::command]
pub async fn download_model(
    app: tauri::AppHandle,
    url: String,
    filename: String,
    on_progress: Channel<DownloadProgress>,
) -> Result<String, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data.join("models");

    // Create models directory if it doesn't exist
    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Failed to create models directory: {}", e))?;

    let target_path = models_dir.join(&filename);

    // If the file already exists, return its path
    if target_path.exists() {
        return Ok(target_path.to_string_lossy().to_string());
    }

    // Download with streaming and progress reporting
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download failed with status: {}",
            response.status()
        ));
    }

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut last_reported: u64 = 0;

    // Write to a temp file first, then rename on success
    let temp_path = models_dir.join(format!("{}.downloading", &filename));
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk =
            chunk_result.map_err(|e| format!("Error reading download stream: {}", e))?;

        file.write_all(&chunk)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded += chunk.len() as u64;

        // Report progress every ~1MB
        if downloaded - last_reported >= 1_048_576 || downloaded == total {
            let _ = on_progress.send(DownloadProgress { downloaded, total });
            last_reported = downloaded;
        }
    }

    file.flush()
        .map_err(|e| format!("Failed to flush file: {}", e))?;
    drop(file);

    // Rename temp file to final name
    std::fs::rename(&temp_path, &target_path)
        .map_err(|e| format!("Failed to finalize download: {}", e))?;

    Ok(target_path.to_string_lossy().to_string())
}

/// Check if a model file exists in the models directory.
#[tauri::command]
pub fn check_model_exists(app: tauri::AppHandle, filename: String) -> Result<bool, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let model_path = app_data.join("models").join(&filename);
    Ok(model_path.exists())
}

/// Get the full path to the models directory.
#[tauri::command]
pub fn get_models_dir(app: tauri::AppHandle) -> Result<String, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data.join("models");
    Ok(models_dir.to_string_lossy().to_string())
}
