import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchArtists, searchByTag } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';

export const GET: RequestHandler = async ({ url, platform }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const mode = url.searchParams.get('mode') === 'tag' ? 'tag' : 'artist';
	const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10);
	const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 100);

	if (!q) {
		return json({ results: [], query: '', mode });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: 'Search unavailable — database not connected' }, { status: 503 });
	}

	const provider = new D1Provider(db);

	try {
		const results =
			mode === 'tag'
				? await searchByTag(provider, q, limit)
				: await searchArtists(provider, q, limit);

		return json(
			{ results, query: q, mode },
			{
				headers: { 'Cache-Control': 'public, max-age=60' }
			}
		);
	} catch (err) {
		console.error('Search API error:', err);
		return json({ error: 'Search failed' }, { status: 500 });
	}
};
