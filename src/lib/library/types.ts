/**
 * Library types — TypeScript interfaces mirroring Rust structs.
 *
 * All field names use snake_case to match Rust's serde serialization.
 * Tauri serializes Rust structs as snake_case by default.
 */

/** Mirrors the Rust `LocalTrack` struct from library/db.rs */
export interface LocalTrack {
	id: number;
	path: string;
	title: string | null;
	artist: string | null;
	album: string | null;
	album_artist: string | null;
	track_number: number | null;
	disc_number: number | null;
	genre: string | null;
	year: number | null;
	duration_secs: number;
	file_modified: number;
	created_at: string;
	cover_art_base64: string | null;
}

/** Mirrors the Rust `MusicFolder` struct from library/db.rs */
export interface MusicFolder {
	id: number;
	path: string;
	added_at: string;
}

/** Mirrors the Rust `ScanProgress` struct from scanner/mod.rs */
export interface ScanProgress {
	scanned: number;
	total: number;
	current_file: string;
}

/** Mirrors the Rust `AlbumCover` struct — one cover per album. */
export interface AlbumCover {
	album: string;
	album_artist: string | null;
	cover_art_base64: string | null;
}

/** Derived grouping for album display in the library browser */
export interface LibraryAlbum {
	name: string;
	artist: string;
	year: number | null;
	tracks: LocalTrack[];
	/** Data URL for the album cover art, taken from first track with embedded art. */
	coverArtBase64: string | null;
}
