pub mod metadata;

use crate::library::db::{self, LocalTrack, MusicFolder};
use rusqlite::Connection;
use serde::Serialize;
use std::sync::Mutex;
use std::time::UNIX_EPOCH;
use tauri::ipc::Channel;
use walkdir::WalkDir;

/// Managed state wrapping the library database connection.
pub struct LibraryState(pub Mutex<Connection>);

#[derive(Clone, Debug, Serialize)]
pub struct ScanProgress {
    pub scanned: u32,
    pub total: u32,
    pub current_file: String,
}

#[tauri::command]
pub async fn scan_folder(
    path: String,
    on_progress: Channel<ScanProgress>,
    state: tauri::State<'_, LibraryState>,
) -> Result<u32, String> {
    // Collect all supported audio files first to know the total
    let audio_files: Vec<_> = WalkDir::new(&path)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| metadata::is_supported_audio(e.path()))
        .map(|e| e.into_path())
        .collect();

    let total = audio_files.len() as u32;
    let mut scanned: u32 = 0;
    let mut success_count: u32 = 0;

    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    for file_path in &audio_files {
        if let Some(track) = metadata::read_track_metadata(file_path) {
            // Get file modification time as unix timestamp
            let file_modified = std::fs::metadata(file_path)
                .and_then(|m| m.modified())
                .map(|t| t.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64)
                .unwrap_or(0);

            if db::insert_track(&conn, &track, file_modified).is_ok() {
                success_count += 1;
            }
        }

        scanned += 1;

        // Send progress every 50 files to avoid IPC flood
        if scanned % 50 == 0 || scanned == total {
            let _ = on_progress.send(ScanProgress {
                scanned,
                total,
                current_file: file_path.to_string_lossy().replace('\\', "/"),
            });
        }
    }

    Ok(success_count)
}

#[tauri::command]
pub fn get_library_tracks(
    state: tauri::State<'_, LibraryState>,
) -> Result<Vec<LocalTrack>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::get_all_tracks(&conn)
}

#[tauri::command]
pub fn get_music_folders(
    state: tauri::State<'_, LibraryState>,
) -> Result<Vec<MusicFolder>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::get_music_folders(&conn)
}

#[tauri::command]
pub fn add_music_folder(
    path: String,
    state: tauri::State<'_, LibraryState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::add_music_folder(&conn, &path)
}

#[tauri::command]
pub fn remove_music_folder(
    path: String,
    state: tauri::State<'_, LibraryState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    db::remove_music_folder(&conn, &path)
}
