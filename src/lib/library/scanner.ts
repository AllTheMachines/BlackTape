/**
 * Scanner — Tauri invoke wrappers for library scanning and folder management.
 *
 * All Tauri imports are dynamic to keep them out of the web build.
 * Functions will only be called in Tauri context (guarded by isTauri checks in callers).
 */

import type { LocalTrack, MusicFolder, ScanProgress } from './types';

/** Dynamically import Tauri invoke to avoid web build failures */
async function getInvoke() {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

/**
 * Scan a music folder for audio files, reporting progress via callback.
 * Returns the number of successfully scanned tracks.
 */
export async function scanMusicFolder(
	path: string,
	onProgress: (p: ScanProgress) => void
): Promise<number> {
	const { invoke, Channel } = await import('@tauri-apps/api/core');
	const channel = new Channel<ScanProgress>();
	channel.onmessage = onProgress;
	return await invoke<number>('scan_folder', { path, onProgress: channel });
}

/**
 * Get all tracks in the library database.
 */
export async function getLibraryTracks(): Promise<LocalTrack[]> {
	const invoke = await getInvoke();
	return await invoke<LocalTrack[]>('get_library_tracks');
}

/**
 * Get all registered music folders.
 */
export async function getMusicFolders(): Promise<MusicFolder[]> {
	const invoke = await getInvoke();
	return await invoke<MusicFolder[]>('get_music_folders');
}

/**
 * Register a new music folder.
 */
export async function addMusicFolder(path: string): Promise<void> {
	const invoke = await getInvoke();
	await invoke('add_music_folder', { path });
}

/**
 * Remove a music folder and its tracks from the library.
 */
export async function removeMusicFolder(path: string): Promise<void> {
	const invoke = await getInvoke();
	await invoke('remove_music_folder', { path });
}

/**
 * Backfill cover art for existing tracks that have no art stored yet.
 * Returns the number of tracks that got art added.
 */
export async function refreshCovers(): Promise<number> {
	const invoke = await getInvoke();
	return await invoke<number>('refresh_covers');
}

/**
 * Set a custom cover image for all tracks in an album.
 * coverArtBase64 should be a data URL (data:image/...;base64,...).
 * Returns the number of tracks updated.
 */
export async function setAlbumCover(album: string, artist: string, coverArtBase64: string): Promise<number> {
	const invoke = await getInvoke();
	return await invoke<number>('set_album_cover', { album, artist, coverArtBase64 });
}

/**
 * Open a native OS folder picker dialog.
 * Returns the selected folder path, or null if cancelled.
 */
export async function pickMusicFolder(): Promise<string | null> {
	const { open } = await import('@tauri-apps/plugin-dialog');
	const selected = await open({
		directory: true,
		multiple: false,
		title: 'Select your music folder'
	});
	return selected as string | null;
}
