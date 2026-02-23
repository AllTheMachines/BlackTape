/**
 * Universal load function for the search page.
 *
 * Coexists with +page.server.ts:
 * - Web (SSR): SvelteKit runs +page.server.ts on the server, passes its
 *   return value as `data`. This function returns it unchanged.
 * - Desktop (Tauri SPA, ssr=false): +page.server.ts is not executed.
 *   This function detects Tauri and queries the local SQLite database.
 *   Also searches the local music library for matching tracks.
 *
 * Dynamic imports keep Tauri dependencies out of the web bundle.
 */

import { isTauri } from '$lib/platform';
import type { PageLoad } from './$types';
import type { ArtistResult } from '$lib/db/queries';
import type { LocalTrack } from '$lib/library/types';

export const load: PageLoad = async ({ url, data }) => {
	// Web SSR: data comes from +page.server.ts — no local library
	if (!isTauri()) {
		return { ...data, localTracks: [] as LocalTrack[] };
	}

	const q = url.searchParams.get('q')?.trim() ?? '';
	const mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';

	if (!q) {
		return {
			results: [] as ArtistResult[],
			query: '',
			mode,
			matchedTag: null as string | null,
			error: false,
			localTracks: [] as LocalTrack[]
		};
	}

	// Everything inside try/catch — an unhandled error here would crash the
	// page (no +error.svelte), unmounting the layout and killing audio playback.
	try {
		console.log('[search] load start, q=', q, 'mode=', mode);
		const { getProvider } = await import('$lib/db/provider');
		const { searchArtists, searchByTag } = await import('$lib/db/queries');

		console.log('[search] getProvider...');
		const provider = await getProvider();
		console.log('[search] searchArtists/searchByTag...');
		const results =
			mode === 'tag' ? await searchByTag(provider, q) : await searchArtists(provider, q);
		console.log('[search] results:', results.length);

		// Also search local library tracks
		let localTracks: LocalTrack[] = [];
		try {
			console.log('[search] getLibraryTracks...');
			const { getLibraryTracks } = await import('$lib/library/scanner');
			const allTracks = await getLibraryTracks();
			console.log('[search] getLibraryTracks done:', allTracks.length);
			const lowerQ = q.toLowerCase();
			localTracks = allTracks.filter(
				(t) =>
					(t.artist && t.artist.toLowerCase().includes(lowerQ)) ||
					(t.title && t.title.toLowerCase().includes(lowerQ)) ||
					(t.album && t.album.toLowerCase().includes(lowerQ))
			);
		} catch {
			// Library search is best-effort — silently fail
		}

		return {
			results,
			query: q,
			mode,
			matchedTag: mode === 'tag' ? q : null,
			error: false,
			localTracks
		};
	} catch (err) {
		console.error('Search error:', err);
		return {
			results: [] as ArtistResult[],
			query: q,
			mode,
			matchedTag: null as string | null,
			error: true,
			localTracks: [] as LocalTrack[]
		};
	}
};
