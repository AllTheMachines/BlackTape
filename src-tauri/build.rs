fn main() {
    // Copy sidecar companion DLLs to the target directory.
    // Tauri's externalBin only copies the .exe — DLLs must be handled manually.
    // Without this, llama-server.exe fails silently (missing ggml.dll, llama.dll, etc).
    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let target_dir = std::path::PathBuf::from(out_dir);
        // OUT_DIR is target/{profile}/build/{crate}/out — go up 3 levels to target/{profile}/
        if let Some(target_dir) = target_dir.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
            let binaries_dir = std::path::Path::new("binaries");
            if let Ok(entries) = std::fs::read_dir(binaries_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().map_or(false, |ext| ext == "dll") {
                        let dest = target_dir.join(path.file_name().unwrap());
                        let _ = std::fs::remove_file(&dest);
                        if let Err(e) = std::fs::copy(&path, &dest) {
                            println!("cargo:warning=Failed to copy DLL {:?}: {}", path, e);
                        }
                    }
                }
            }
        }
    }

    tauri_build::build()
}
