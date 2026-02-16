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
}

pub fn is_supported_audio(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| SUPPORTED_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
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
    let year = tag
        .get_string(ItemKey::Year)
        .and_then(|s| s.parse::<u32>().ok())
        .or_else(|| {
            tag.get_string(ItemKey::RecordingDate)
                .and_then(|s| s.get(..4))
                .and_then(|s| s.parse::<u32>().ok())
        });
    let duration_secs = tagged_file.properties().duration().as_secs_f64();

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
    })
}
