/**
 * Load function for the search page — Tauri desktop only.
 *
 * export const prerender = true causes adapter-static to generate a static
 * __data.json at build time. Without it, SvelteKit client-side navigation
 * fetches __data.json at runtime — Tauri returns index.html as fallback
 * and SvelteKit crashes on JSON.parse('<!doctype html>').
 * The pre-rendered file has empty results; +page.ts then runs and does
 * the actual invoke() search.
 */

import type { PageLoad } from './$types';
import type { ArtistResult } from '$lib/db/queries';
import type { LocalTrack } from '$lib/library/types';

export const prerender = true;

export const load: PageLoad = async ({ url }) => {
	// During prerendering url.searchParams is unavailable — return empty placeholder.
	// At runtime in Tauri the actual search runs via the Tauri commands below.
	let q = '';
	let mode: 'artist' | 'tag' = 'artist';
	try {
		q = url.searchParams.get('q')?.trim() ?? '';
		mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';
	} catch {
		return { results: [] as ArtistResult[], query: '', mode: 'artist' as const, matchedTag: null as string | null, error: false, localTracks: [] as LocalTrack[] };
	}

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

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { searchArtists, searchByTag } = await import('$lib/db/queries');

		const provider = await getProvider();
		const results =
			mode === 'tag' ? await searchByTag(provider, q) : await searchArtists(provider, q);

		let localTracks: LocalTrack[] = [];
		try {
			const { getLibraryTracks } = await import('$lib/library/scanner');
			const allTracks = await getLibraryTracks();
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
