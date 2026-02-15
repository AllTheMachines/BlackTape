import type { PageServerLoad } from './$types';
import { searchArtists, searchByTag } from '$lib/db/queries';

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

	try {
		const results =
			mode === 'tag' ? await searchByTag(db, q) : await searchArtists(db, q);

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
