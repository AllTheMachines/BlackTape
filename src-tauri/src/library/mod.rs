pub mod db;

// Re-exports for convenience — used by future modules (audio player, UI)
#[allow(unused_imports)]
pub use db::{LocalTrack, MusicFolder};
