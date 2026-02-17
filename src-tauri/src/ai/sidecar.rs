use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// Default port for the generation (chat/completion) llama-server instance.
const GENERATION_PORT: u16 = 8847;
/// Default port for the embedding llama-server instance.
const EMBEDDING_PORT: u16 = 8848;
/// PID file names written to app data dir for orphan detection.
const GEN_PID_FILE: &str = "llama-gen.pid";
const EMBED_PID_FILE: &str = "llama-embed.pid";

/// Managed state for AI sidecar processes.
pub struct AiSidecarState {
    pub generation_child: Option<tauri_plugin_shell::process::CommandChild>,
    pub embedding_child: Option<tauri_plugin_shell::process::CommandChild>,
    pub generation_port: u16,
    pub embedding_port: u16,
    pub enabled: bool,
}

impl Default for AiSidecarState {
    fn default() -> Self {
        Self {
            generation_child: None,
            embedding_child: None,
            generation_port: GENERATION_PORT,
            embedding_port: EMBEDDING_PORT,
            enabled: false,
        }
    }
}

/// Thread-safe wrapper for AiSidecarState, managed by Tauri.
pub struct SidecarState(pub Mutex<AiSidecarState>);

#[derive(Clone, Debug, Serialize)]
pub struct AiStatus {
    pub generation_running: bool,
    pub embedding_running: bool,
    pub generation_port: u16,
    pub embedding_port: u16,
    pub enabled: bool,
}

/// Start the generation (chat/completion) llama-server sidecar.
/// Reads model path from taste.db ai_settings.
#[tauri::command]
pub fn start_generation_server(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarState>,
    taste_state: tauri::State<'_, super::taste_db::TasteDbState>,
) -> Result<String, String> {
    let mut sidecar = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if sidecar.generation_child.is_some() {
        return Ok("Generation server already running".to_string());
    }

    // Read model path from taste.db
    let conn = taste_state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let model_path: String = conn
        .query_row(
            "SELECT value FROM ai_settings WHERE key = 'local_gen_model_path'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "No generation model path configured. Set local_gen_model_path in AI settings.".to_string())?;

    if model_path.is_empty() {
        return Err("Generation model path is empty".to_string());
    }
    drop(conn);

    let port_str = sidecar.generation_port.to_string();
    let shell = app.shell();
    let command = shell
        .sidecar("llama-server")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args([
            "--model", &model_path,
            "--port", &port_str,
            "--ctx-size", "4096",
            "--threads", "4",
            "--no-mmap",
        ]);

    let (mut _rx, child) = command
        .spawn()
        .map_err(|e| format!("Failed to spawn generation server: {}", e))?;

    // Write PID file for orphan detection
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pid = child.pid();
    write_pid_file(&app_data, GEN_PID_FILE, pid);

    sidecar.generation_child = Some(child);
    sidecar.enabled = true;

    Ok(format!("Generation server started on port {}", sidecar.generation_port))
}

/// Start the embedding llama-server sidecar.
/// Reads embedding model path from taste.db ai_settings.
#[tauri::command]
pub fn start_embedding_server(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarState>,
    taste_state: tauri::State<'_, super::taste_db::TasteDbState>,
) -> Result<String, String> {
    let mut sidecar = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if sidecar.embedding_child.is_some() {
        return Ok("Embedding server already running".to_string());
    }

    // Read embedding model path from taste.db
    let conn = taste_state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let model_path: String = conn
        .query_row(
            "SELECT value FROM ai_settings WHERE key = 'local_embed_model_path'",
            [],
            |row| row.get(0),
        )
        .map_err(|_| "No embedding model path configured. Set local_embed_model_path in AI settings.".to_string())?;

    if model_path.is_empty() {
        return Err("Embedding model path is empty".to_string());
    }
    drop(conn);

    let port_str = sidecar.embedding_port.to_string();
    let shell = app.shell();
    let command = shell
        .sidecar("llama-server")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .args([
            "--model", &model_path,
            "--port", &port_str,
            "--ctx-size", 512.to_string().as_str(),
            "--threads", "4",
            "--no-mmap",
            "--embedding",
        ]);

    let (mut _rx, child) = command
        .spawn()
        .map_err(|e| format!("Failed to spawn embedding server: {}", e))?;

    // Write PID file for orphan detection
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pid = child.pid();
    write_pid_file(&app_data, EMBED_PID_FILE, pid);

    sidecar.embedding_child = Some(child);

    Ok(format!("Embedding server started on port {}", sidecar.embedding_port))
}

/// Stop both AI sidecar servers.
#[tauri::command]
pub fn stop_ai_servers(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarState>,
) -> Result<String, String> {
    let mut sidecar = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    if let Some(child) = sidecar.generation_child.take() {
        let _ = child.kill();
    }
    if let Some(child) = sidecar.embedding_child.take() {
        let _ = child.kill();
    }

    sidecar.enabled = false;

    // Remove PID files
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    remove_pid_file(&app_data, GEN_PID_FILE);
    remove_pid_file(&app_data, EMBED_PID_FILE);

    Ok("AI servers stopped".to_string())
}

/// Get the current status of AI sidecar processes.
#[tauri::command]
pub fn get_ai_status(
    state: tauri::State<'_, SidecarState>,
) -> Result<AiStatus, String> {
    let sidecar = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;

    Ok(AiStatus {
        generation_running: sidecar.generation_child.is_some(),
        embedding_running: sidecar.embedding_child.is_some(),
        generation_port: sidecar.generation_port,
        embedding_port: sidecar.embedding_port,
        enabled: sidecar.enabled,
    })
}

/// Clean up orphaned llama-server processes from a previous crash.
/// Called on app startup. Reads PID files and kills stale processes.
pub fn cleanup_orphaned_servers(app_data: &Path) {
    cleanup_pid_file(app_data, GEN_PID_FILE);
    cleanup_pid_file(app_data, EMBED_PID_FILE);
}

fn cleanup_pid_file(app_data: &Path, pid_file: &str) {
    let path = app_data.join(pid_file);
    if !path.exists() {
        return;
    }

    if let Ok(contents) = std::fs::read_to_string(&path) {
        if let Ok(pid) = contents.trim().parse::<u32>() {
            // Attempt to kill the orphaned process
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("kill")
                    .args(["-9", &pid.to_string()])
                    .output();
            }
        }
    }

    // Remove stale PID file regardless
    let _ = std::fs::remove_file(&path);
}

fn write_pid_file(app_data: &Path, pid_file: &str, pid: u32) {
    let path = app_data.join(pid_file);
    let _ = std::fs::write(&path, pid.to_string());
}

fn remove_pid_file(app_data: &Path, pid_file: &str) {
    let path = app_data.join(pid_file);
    let _ = std::fs::remove_file(&path);
}
