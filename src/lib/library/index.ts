/**
 * Library module — public API barrel export.
 *
 * Usage:
 *   import { libraryState, loadLibrary, scanFolder } from '$lib/library';
 */

export type { LocalTrack, MusicFolder, ScanProgress, EnrichProgress, LibraryAlbum } from './types';

export {
	libraryState,
	loadLibrary,
	scanFolder,
	runEnrichment,
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
