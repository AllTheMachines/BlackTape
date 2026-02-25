use base64::{engine::general_purpose, Engine as _};
use lofty::file::TaggedFileExt;
use lofty::prelude::*;
use serde::Serialize;
use std::path::Path;

pub const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "flac", "ogg", "m4a", "aac", "wav", "opus", "wv"];

#[derive(Clone, Debug, Serialize)]
pub struct TrackMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub album_artist: Option<String>,
    pub track_number: Option<u32>,
    pub disc_number: Option<u32>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub duration_secs: f64,
    pub path: String,
    /// First embedded cover art as a data URL (data:image/jpeg;base64,...), if present.
    pub cover_art_base64: Option<String>,
}

pub fn is_supported_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Extract a year from tag metadata strings. Prefers the Year tag; falls back to the
/// first 4 characters of RecordingDate (handles "2023-06-20" → 2023).
pub(crate) fn parse_year_from_tags(
    year_str: Option<&str>,
    recording_date_str: Option<&str>,
) -> Option<u32> {
    year_str
        .and_then(|s| s.parse::<u32>().ok())
        .or_else(|| {
            recording_date_str
                .and_then(|s| s.get(..4))
                .and_then(|s| s.parse::<u32>().ok())
        })
}

pub fn read_track_metadata(path: &Path) -> Option<TrackMetadata> {
    let tagged_file = lofty::read_from_path(path).ok()?;

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag())?;

    let title = tag.title().map(|s| s.to_string());
    let artist = tag.artist().map(|s| s.to_string());
    let album = tag.album().map(|s| s.to_string());
    let album_artist = tag
        .get_string(ItemKey::AlbumArtist)
        .map(|s| s.to_string());
    let track_number = tag.track();
    let disc_number = tag.disk();
    let genre = tag.genre().map(|s| s.to_string());
    let year = parse_year_from_tags(
        tag.get_string(ItemKey::Year),
        tag.get_string(ItemKey::RecordingDate),
    );
    let duration_secs = tagged_file.properties().duration().as_secs_f64();

    // Extract first embedded cover art as a base64 data URL
    let cover_art_base64 = tag.pictures().first().map(|pic| {
        let mime = pic
            .mime_type()
            .map(|m| m.to_string())
            .unwrap_or_else(|| "image/jpeg".to_string());
        let encoded = general_purpose::STANDARD.encode(pic.data());
        format!("data:{};base64,{}", mime, encoded)
    });

    // Normalize path to forward slashes for cross-platform consistency
    let normalized_path = path.to_string_lossy().replace('\\', "/");

    Some(TrackMetadata {
        title,
        artist,
        album,
        album_artist,
        track_number,
        disc_number,
        genre,
        year,
        duration_secs,
        path: normalized_path,
        cover_art_base64,
    })
}

// ---------------------------------------------------------------------------
// RUST-03: Unit tests for scanner metadata helpers
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::{is_supported_audio, parse_year_from_tags, SUPPORTED_EXTENSIONS};
    use std::path::Path;

    #[test]
    fn all_supported_extensions_recognized() {
        for ext in SUPPORTED_EXTENSIONS {
            let path_str = format!("track.{}", ext);
            let path = Path::new(&path_str);
            assert!(
                is_supported_audio(path),
                "Expected .{} to be a supported audio format",
                ext
            );
        }
    }

    #[test]
    fn unsupported_extensions_rejected() {
        assert!(!is_supported_audio(Path::new("image.jpg")));
        assert!(!is_supported_audio(Path::new("doc.pdf")));
        assert!(!is_supported_audio(Path::new("script.py")));
        assert!(!is_supported_audio(Path::new("archive.zip")));
    }

    #[test]
    fn no_extension_rejected() {
        assert!(!is_supported_audio(Path::new("trackfile")));
    }

    #[test]
    fn extension_check_is_case_insensitive() {
        assert!(is_supported_audio(Path::new("track.MP3")));
        assert!(is_supported_audio(Path::new("track.FLAC")));
    }

    #[test]
    fn year_from_year_tag() {
        assert_eq!(parse_year_from_tags(Some("2023"), None), Some(2023));
    }

    #[test]
    fn year_from_recording_date_prefix() {
        assert_eq!(parse_year_from_tags(None, Some("2001-06-20")), Some(2001));
    }

    #[test]
    fn year_tag_takes_precedence_over_recording_date() {
        assert_eq!(
            parse_year_from_tags(Some("2023"), Some("2019-01-01")),
            Some(2023)
        );
    }

    #[test]
    fn invalid_year_strings_return_none() {
        assert_eq!(parse_year_from_tags(Some("not-a-year"), None), None);
        assert_eq!(parse_year_from_tags(None, Some("no-date-here")), None);
    }

    #[test]
    fn both_none_returns_none() {
        assert_eq!(parse_year_from_tags(None, None), None);
    }

    #[test]
    fn short_recording_date_handled_gracefully() {
        // "20" is only 2 chars, can't extract a 4-char year prefix
        assert_eq!(parse_year_from_tags(None, Some("20")), None);
        // "2023" exactly 4 chars → valid
        assert_eq!(parse_year_from_tags(None, Some("2023")), Some(2023));
    }
}
