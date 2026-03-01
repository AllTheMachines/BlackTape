/// Playlist export commands — M3U8 and Traktor NML generation, plus file copy.
///
/// The frontend handles the folder picker dialog and passes the resolved path.
/// These commands do the file I/O and return a summary string on completion.

use std::path::Path;

/// Minimal track descriptor sent from the frontend.
#[allow(dead_code)]
#[derive(serde::Deserialize)]
pub struct ExportTrack {
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_secs: f64,
}

/// Write tracks as an Extended M3U8 playlist file.
///
/// Format:
///   #EXTM3U
///   #EXTINF:<duration>,<artist> - <title>
///   /path/to/file.mp3
///   ...
///
/// Only tracks with a non-empty path are included (streaming-only tracks skipped).
#[tauri::command]
pub fn export_queue_m3u(tracks: Vec<ExportTrack>, output_path: String) -> Result<String, String> {
    let local_tracks: Vec<&ExportTrack> = tracks.iter().filter(|t| !t.path.is_empty()).collect();

    if local_tracks.is_empty() {
        return Err("No local tracks to export.".into());
    }

    let mut lines = vec!["#EXTM3U".to_string()];
    for t in &local_tracks {
        let duration = t.duration_secs.floor() as i64;
        lines.push(format!("#EXTINF:{},{} - {}", duration, t.artist, t.title));
        lines.push(t.path.clone());
    }
    lines.push(String::new()); // trailing newline

    std::fs::write(&output_path, lines.join("\n"))
        .map_err(|e| format!("Failed to write M3U file: {}", e))?;

    Ok(format!("Exported {} tracks to M3U playlist.", local_tracks.len()))
}

/// Write tracks as a Traktor NML playlist file (Native Instruments DJ software).
///
/// Traktor uses an XML format with a unique path encoding:
///   VOLUME = drive letter (e.g. "C:")
///   DIR    = directory path with each segment prefixed by "/:" (e.g. "/:Users/:Music/:")
///   FILE   = filename only
///
/// Only tracks with a non-empty path are included.
#[tauri::command]
pub fn export_queue_nml(tracks: Vec<ExportTrack>, output_path: String) -> Result<String, String> {
    let local_tracks: Vec<&ExportTrack> = tracks.iter().filter(|t| !t.path.is_empty()).collect();

    if local_tracks.is_empty() {
        return Err("No local tracks to export.".into());
    }

    let mut entries = String::new();
    for t in &local_tracks {
        let (volume, dir, file) = split_path_for_traktor(&t.path);
        entries.push_str(&format!(
            "    <ENTRY TITLE=\"{}\" ARTIST=\"{}\">\n      <LOCATION DIR=\"{}\" FILE=\"{}\" VOLUME=\"{}\" VOLUMEID=\"{}\"/>\n    </ENTRY>\n",
            xml_escape(&t.title),
            xml_escape(&t.artist),
            xml_escape(&dir),
            xml_escape(&file),
            xml_escape(&volume),
            xml_escape(&volume),
        ));
    }

    let nml = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<NML VERSION=\"19\">\n  <COLLECTION ENTRIES=\"{}\">\n{}  </COLLECTION>\n</NML>\n",
        local_tracks.len(),
        entries
    );

    std::fs::write(&output_path, nml)
        .map_err(|e| format!("Failed to write NML file: {}", e))?;

    Ok(format!("Exported {} tracks to Traktor NML playlist.", local_tracks.len()))
}

/// Copy track files from the queue to a destination folder.
///
/// Returns a summary string: "Copied N tracks. Skipped M (no local file)."
/// Files are copied flat (no folder structure preserved).
/// Filename conflicts are resolved by appending a counter suffix.
#[tauri::command]
pub fn copy_tracks_to_folder(tracks: Vec<ExportTrack>, output_dir: String) -> Result<String, String> {
    let dest = Path::new(&output_dir);
    if !dest.exists() {
        std::fs::create_dir_all(dest)
            .map_err(|e| format!("Failed to create destination folder: {}", e))?;
    }

    let mut copied = 0u32;
    let mut skipped = 0u32;

    for track in &tracks {
        if track.path.is_empty() {
            skipped += 1;
            continue;
        }

        let src = Path::new(&track.path);
        if !src.exists() {
            skipped += 1;
            continue;
        }

        let filename = src.file_name().unwrap_or_default();
        let mut dest_path = dest.join(filename);

        // Resolve filename conflicts by appending _2, _3, etc.
        if dest_path.exists() {
            let stem = src.file_stem().and_then(|s| s.to_str()).unwrap_or("track");
            let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("");
            let mut counter = 2u32;
            loop {
                let candidate = if ext.is_empty() {
                    format!("{}_{}", stem, counter)
                } else {
                    format!("{}_{}.{}", stem, counter, ext)
                };
                dest_path = dest.join(&candidate);
                if !dest_path.exists() {
                    break;
                }
                counter += 1;
            }
        }

        std::fs::copy(src, &dest_path)
            .map_err(|e| format!("Failed to copy {}: {}", track.path, e))?;
        copied += 1;
    }

    Ok(format!(
        "Copied {} track{}. Skipped {} (no local file).",
        copied,
        if copied == 1 { "" } else { "s" },
        skipped
    ))
}

/// Convert a file path into Traktor's volume/dir/file triple.
///
/// Windows: `C:\Users\Music\track.mp3` → volume="C:", dir="/:Users/:Music/:", file="track.mp3"
/// Unix:    `/home/user/Music/track.mp3` → volume="/", dir="/:home/:user/:Music/:", file="track.mp3"
fn split_path_for_traktor(path: &str) -> (String, String, String) {
    // Normalize to forward slashes
    let normalized = path.replace('\\', "/");
    let p = Path::new(&normalized);

    let file = p
        .file_name()
        .and_then(|f| f.to_str())
        .unwrap_or("")
        .to_string();

    // On Windows the first component is e.g. "C:"
    let components: Vec<&str> = normalized.split('/').filter(|s| !s.is_empty()).collect();

    if components.len() < 2 {
        return ("".into(), "/:".into(), file);
    }

    // Detect Windows drive letter (e.g. "C:")
    let (volume, dir_components) = if components[0].ends_with(':') {
        (components[0].to_string(), &components[1..components.len().saturating_sub(1)])
    } else {
        ("/".to_string(), &components[..components.len().saturating_sub(1)])
    };

    let dir = if dir_components.is_empty() {
        "/:".to_string()
    } else {
        format!("{}/:","/:".to_string() + &dir_components.join("/:"))
    };

    (volume, dir, file)
}

/// Escape special XML characters in attribute values.
fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
