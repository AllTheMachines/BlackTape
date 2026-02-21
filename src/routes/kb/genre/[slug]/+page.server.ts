import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { D1Provider } from '$lib/db/d1-provider';
import { getGenreBySlug, getGenreKeyArtists, getGenreSubgraph } from '$lib/db/queries';

async function fetchWikipediaSummary(title: string): Promise<string | null> {
	const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
	try {
		// Cloudflare Cache API — 24hr TTL (only available in CF Workers runtime)
		const cache = typeof caches !== 'undefined' ? await caches.open('wikipedia') : null;
		if (cache) {
			const cached = await cache.match(url);
			if (cached) {
				const data = (await cached.json()) as { extract?: string };
				return data.extract ?? null;
			}
		}

		const resp = await fetch(url, {
			headers: { 'User-Agent': 'Mercury/0.1.0', Accept: 'application/json' }
		});
		if (!resp.ok) return null;
		const data = (await resp.json()) as { extract?: string };

		// Store in cache with 24hr TTL
		if (cache && resp.ok) {
			const cacheResp = new Response(JSON.stringify(data), {
				headers: {
					'Cache-Control': 'public, max-age=86400',
					'Content-Type': 'application/json'
				}
			});
			await cache.put(url, cacheResp);
		}

		return data.extract ?? null;
	} catch {
		return null;
	}
}

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform?.env?.DB) {
		return {
			genre: null,
			keyArtists: [],
			subgraph: { nodes: [], edges: [] },
			wikipediaSummary: null
		};
	}
	const db = new D1Provider(platform.env.DB);
	const genre = await getGenreBySlug(db, params.slug);
	if (!genre) throw error(404, 'Genre not found');

	const [keyArtists, subgraph, wikipediaSummary] = await Promise.allSettled([
		getGenreKeyArtists(db, genre.mb_tag ?? genre.name.toLowerCase()),
		getGenreSubgraph(db, params.slug),
		fetchWikipediaSummary(genre.wikipedia_title ?? genre.name)
	]);

	return {
		genre,
		keyArtists: keyArtists.status === 'fulfilled' ? keyArtists.value : [],
		subgraph: subgraph.status === 'fulfilled' ? subgraph.value : { nodes: [], edges: [] },
		wikipediaSummary: wikipediaSummary.status === 'fulfilled' ? wikipediaSummary.value : null
	};
};
