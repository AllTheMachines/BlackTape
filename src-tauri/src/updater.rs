use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub notes: Option<String>,
    pub critical: bool,
}

#[derive(Clone, Serialize)]
struct DownloadProgress {
    downloaded: usize,
    total: Option<u64>,
}

/// Check GitHub Releases for a newer version of the app.
#[tauri::command]
pub async fn check_for_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| format!("Updater build error: {}", e))?;

    match updater.check().await {
        Ok(Some(update)) => {
            let raw_notes = update.body.clone().unwrap_or_default();
            let (critical, clean_notes) = if raw_notes.starts_with("[CRITICAL]") {
                (true, raw_notes.trim_start_matches("[CRITICAL]").trim_start().to_string())
            } else {
                (false, raw_notes)
            };
            Ok(UpdateInfo {
                available: true,
                version: Some(update.version.clone()),
                notes: if clean_notes.is_empty() { None } else { Some(clean_notes) },
                critical,
            })
        }
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
            notes: None,
            critical: false,
        }),
        Err(e) => Err(format!("Update check failed: {}", e)),
    }
}

/// Download and install the latest update, then exit.
/// The NSIS installer (launched by download_and_install) handles starting the new version.
#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app
        .updater_builder()
        .build()
        .map_err(|e| format!("Updater build error: {}", e))?;

    let update = updater
        .check()
        .await
        .map_err(|e| format!("Update check failed: {}", e))?
        .ok_or_else(|| "No update available".to_string())?;

    let handle = app.clone();
    update
        .download_and_install(
            move |downloaded, total| {
                let _ = handle.emit("update-progress", DownloadProgress { downloaded, total });
            },
            || {},
        )
        .await
        .map_err(|e| format!("Install failed: {}", e))?;

    // Tell frontend to show "Restarting..." then relaunch on a background thread
    // so the event loop can deliver the event before we restart
    let _ = app.emit("update-restarting", ());

    #[cfg(target_os = "macos")]
    {
        // On macOS, app.restart() (exec) is unreliable after the bundle is replaced by the updater.
        // Use `open -n <bundle>` via Launch Services instead — it respects code signing + quarantine.
        std::thread::spawn(|| {
            std::thread::sleep(std::time::Duration::from_millis(2500));
            if let Ok(exe) = std::env::current_exe() {
                // exe path: BlackTape.app/Contents/MacOS/BlackTape
                // 3 ancestors up → BlackTape.app
                if let Some(app_bundle) = exe.ancestors().nth(3) {
                    let _ = std::process::Command::new("open")
                        .arg("-n")
                        .arg(app_bundle)
                        .spawn();
                    std::thread::sleep(std::time::Duration::from_millis(500));
                }
            }
            std::process::exit(0);
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        let app2 = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(2500));
            app2.restart();
        });
    }

    Ok(())
}

/// Return the current app version string (e.g. "0.1.0").
#[tauri::command]
pub fn get_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}
