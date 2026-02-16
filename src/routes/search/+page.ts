/**
 * Universal load function for the search page.
 *
 * Coexists with +page.server.ts:
 * - Web (SSR): SvelteKit runs +page.server.ts on the server, passes its
 *   return value as `data`. This function returns it unchanged.
 * - Desktop (Tauri SPA, ssr=false): +page.server.ts is not executed.
 *   This function detects Tauri and queries the local SQLite database.
 *
 * Dynamic imports keep Tauri dependencies out of the web bundle.
 */

import { isTauri } from '$lib/platform';
import type { PageLoad } from './$types';
import type { ArtistResult } from '$lib/db/queries';

export const load: PageLoad = async ({ url, data }) => {
	// Web SSR: data comes from +page.server.ts
	if (!isTauri()) {
		return data;
	}

	// Tauri desktop: query local database
	const { getProvider } = await import('$lib/db/provider');
	const { searchArtists, searchByTag } = await import('$lib/db/queries');

	const q = url.searchParams.get('q')?.trim() ?? '';
	const mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';

	if (!q) {
		return {
			results: [] as ArtistResult[],
			query: '',
			mode,
			matchedTag: null as string | null,
			error: false
		};
	}

	try {
		const provider = await getProvider();
		const results =
			mode === 'tag' ? await searchByTag(provider, q) : await searchArtists(provider, q);
		return {
			results,
			query: q,
			mode,
			matchedTag: mode === 'tag' ? q : null,
			error: false
		};
	} catch (err) {
		console.error('Search error:', err);
		return {
			results: [] as ArtistResult[],
			query: q,
			mode,
			matchedTag: null as string | null,
			error: true
		};
	}
};
