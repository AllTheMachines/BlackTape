import type { PageServerLoad } from './$types';
import { searchArtists, searchByTag } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';

export const load: PageServerLoad = async ({ url, platform }) => {
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
