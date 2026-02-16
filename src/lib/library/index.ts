/**
 * Library module — public API barrel export.
 *
 * Usage:
 *   import { libraryState, loadLibrary, scanFolder } from '$lib/library';
 */

export type { LocalTrack, MusicFolder, ScanProgress, LibraryAlbum } from './types';

export {
	libraryState,
	loadLibrary,
	scanFolder,
	groupByAlbum,
	getSortedTracks
} from './store.svelte';

export {
	scanMusicFolder,
	getLibraryTracks,
	getMusicFolders,
	addMusicFolder,
	removeMusicFolder,
	pickMusicFolder
} from './scanner';
