/**
 * Library store — reactive state for the local music library.
 *
 * Uses Svelte 5 runes ($state) for global reactivity.
 * Must use .svelte.ts extension for rune support.
 */

import type { LocalTrack, MusicFolder, ScanProgress, LibraryAlbum, AlbumCover } from './types';
import {
	getLibraryTracks,
	getMusicFolders,
	addMusicFolder,
	scanMusicFolder,
	getAlbumCovers
} from './scanner';

export const libraryState = $state({
	tracks: [] as LocalTrack[],
	folders: [] as MusicFolder[],
	coverMap: new Map<string, string>(),
	isScanning: false,
	scanProgress: null as ScanProgress | null,
	isLoaded: false,
	sortBy: 'artist' as 'artist' | 'album' | 'title' | 'added',
	sortAsc: true
});

/** Build a map keyed by "artist|||album" → cover_art_base64 (matches groupByAlbum key format) */
function buildCoverMap(covers: AlbumCover[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const c of covers) {
		if (c.cover_art_base64) {
			const artist = c.album_artist || 'Unknown Artist';
			const album = c.album || 'Unknown Album';
			map.set(`${artist}|||${album}`, c.cover_art_base64);
		}
	}
	return map;
}

/**
 * Load the full library (tracks + folders) from the Tauri backend.
 */
export async function loadLibrary(): Promise<void> {
	const [tracks, folders, covers] = await Promise.all([
		getLibraryTracks(),
		getMusicFolders(),
		getAlbumCovers()
	]);
	libraryState.tracks = tracks;
	libraryState.folders = folders;
	libraryState.coverMap = buildCoverMap(covers);
	libraryState.isLoaded = true;
}

/**
 * Add and scan a music folder. Updates state reactively during scan.
 */
export async function scanFolder(path: string): Promise<void> {
	libraryState.isScanning = true;
	libraryState.scanProgress = null;

	try {
		await addMusicFolder(path);
		await scanMusicFolder(path, (progress) => {
			libraryState.scanProgress = progress;
		});

		// Reload everything after scan completes
		const [tracks, folders, covers] = await Promise.all([
			getLibraryTracks(),
			getMusicFolders(),
			getAlbumCovers()
		]);
		libraryState.tracks = tracks;
		libraryState.folders = folders;
		libraryState.coverMap = buildCoverMap(covers);
	} finally {
		libraryState.isScanning = false;
		libraryState.scanProgress = null;
	}
}

/**
 * Group tracks into albums by album_artist (or artist) + album name.
 * Tracks within each album are sorted by disc_number then track_number.
 */
export function groupByAlbum(tracks: LocalTrack[], coverMap?: Map<string, string>): LibraryAlbum[] {
	const albumMap = new Map<string, LibraryAlbum>();

	for (const track of tracks) {
		const artist = track.album_artist || track.artist || 'Unknown Artist';
		const albumName = track.album || 'Unknown Album';
		const key = `${artist}|||${albumName}`;

		let album = albumMap.get(key);
		if (!album) {
			const cover = coverMap?.get(key) ?? track.cover_art_base64 ?? null;
			album = {
				name: albumName,
				artist,
				year: track.year,
				tracks: [],
				coverArtBase64: cover
			};
			albumMap.set(key, album);
		}

		album.tracks.push(track);

		// Use earliest non-null year across tracks in the album
		if (track.year !== null && (album.year === null || track.year < album.year)) {
			album.year = track.year;
		}
	}

	// Sort tracks within each album by disc then track number
	for (const album of albumMap.values()) {
		album.tracks.sort((a, b) => {
			const discA = a.disc_number ?? 1;
			const discB = b.disc_number ?? 1;
			if (discA !== discB) return discA - discB;
			const trackA = a.track_number ?? 0;
			const trackB = b.track_number ?? 0;
			return trackA - trackB;
		});
	}

	// Sort albums by artist name then album name
	return Array.from(albumMap.values()).sort((a, b) => {
		const artistCmp = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' });
		if (artistCmp !== 0) return artistCmp;
		return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
	});
}

/**
 * Get tracks sorted by the current sort settings.
 */
export function getSortedTracks(): LocalTrack[] {
	const sorted = [...libraryState.tracks];
	const dir = libraryState.sortAsc ? 1 : -1;

	sorted.sort((a, b) => {
		switch (libraryState.sortBy) {
			case 'artist': {
				const artistA = (a.album_artist || a.artist || '').toLowerCase();
				const artistB = (b.album_artist || b.artist || '').toLowerCase();
				return dir * artistA.localeCompare(artistB);
			}
			case 'album': {
				const albumA = (a.album || '').toLowerCase();
				const albumB = (b.album || '').toLowerCase();
				return dir * albumA.localeCompare(albumB);
			}
			case 'title': {
				const titleA = (a.title || '').toLowerCase();
				const titleB = (b.title || '').toLowerCase();
				return dir * titleA.localeCompare(titleB);
			}
			case 'added': {
				return dir * a.created_at.localeCompare(b.created_at);
			}
			default:
				return 0;
		}
	});

	return sorted;
}
