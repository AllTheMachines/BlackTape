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
import type { ArtistResult, SearchIntent } from '$lib/db/queries';
import type { LocalTrack } from '$lib/library/types';

export const prerender = true;

const EMPTY_INTENT: SearchIntent = { type: 'artist', raw: '', entity: '' };

export const load: PageLoad = async ({ url }) => {
	// During prerendering url.searchParams is unavailable — return empty placeholder.
	// At runtime in Tauri the actual search runs via the Tauri commands below.
	let q = '';
	let mode: 'artist' | 'tag' = 'artist';
	try {
		q = url.searchParams.get('q')?.trim() ?? '';
		mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';
	} catch {
		return {
			results: [] as ArtistResult[],
			query: '',
			mode: 'artist' as const,
			matchedTag: null as string | null,
			intent: EMPTY_INTENT,
			error: false,
			localTracks: [] as LocalTrack[]
		};
	}

	if (!q) {
		return {
			results: [] as ArtistResult[],
			query: '',
			mode,
			matchedTag: null as string | null,
			intent: EMPTY_INTENT,
			error: false,
			localTracks: [] as LocalTrack[]
		};
	}

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { searchArtists, searchByTag, parseSearchIntent, searchByCity, searchByLabel } =
			await import('$lib/db/queries');

		const provider = await getProvider();

		// Parse intent from the query (unless mode toggle explicitly sets tag search).
		// Tag mode uses its own search path — intent stays 'artist' for chip display purposes.
		const intent: SearchIntent = mode === 'tag'
			? { type: 'artist', raw: q, entity: q }
			: parseSearchIntent(q);

		let results: ArtistResult[];
		if (mode === 'tag') {
			results = await searchByTag(provider, q);
		} else if (intent.type === 'city') {
			results = await searchByCity(provider, intent.entity);
		} else if (intent.type === 'label') {
			results = await searchByLabel(provider, intent.entity);
		} else {
			results = await searchArtists(provider, q);
		}

		let localTracks: LocalTrack[] = [];
		try {
			const { searchLocalTracks } = await import('$lib/library/scanner');
			localTracks = await searchLocalTracks(q);
		} catch {
			// Library search is best-effort — silently fail
		}

		return {
			results,
			query: q,
			mode,
			matchedTag: mode === 'tag' ? q : null,
			intent,
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
			intent: { type: 'artist', raw: q, entity: q } as SearchIntent,
			error: true,
			localTracks: [] as LocalTrack[]
		};
	}
};
