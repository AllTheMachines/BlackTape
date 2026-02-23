import type { PageServerLoad } from './$types';
import { searchArtists, searchByTag } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';

// In Tauri builds: pre-render the route so adapter-static generates __data.json.
// Without this, client-side navigation fetches __data.json at runtime, Tauri returns
// index.html as the fallback, and SvelteKit crashes on JSON.parse('<!doctype html>').
// The pre-rendered __data.json has empty results (no url dependency) so SvelteKit
// uses it without refetching, then +page.ts runs and does the actual invoke() search.
export const prerender = import.meta.env.VITE_TAURI === '1';

export const load: PageServerLoad = async ({ url, platform }) => {
	// Tauri build: return empty placeholder — +page.ts handles search via invoke()
	if (import.meta.env.VITE_TAURI === '1') {
		return { results: [], query: '', mode: 'artist' as const, matchedTag: null, error: false };
	}

	const q = url.searchParams.get('q')?.trim() ?? '';
	const mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';

	if (!q) {
		return { results: [], query: '', mode, matchedTag: null, error: false };
	}

	const db = platform?.env?.DB;
	if (!db) {
		return { results: [], query: q, mode, matchedTag: null, error: true };
	}

	const provider = new D1Provider(db);

	try {
		const results =
			mode === 'tag'
				? await searchByTag(provider, q)
				: await searchArtists(provider, q);

		return {
			results,
			query: q,
			mode,
			matchedTag: mode === 'tag' ? q : null,
			error: false
		};
	} catch (err) {
		console.error('Search load error:', err);
		return { results: [], query: q, mode, matchedTag: null, error: true };
	}
};
