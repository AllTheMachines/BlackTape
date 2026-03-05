import type { PageLoad } from './$types';

const MB_TIMEOUT_MS = 6_000;

async function fetchStreamingLinks(mbid: string, fetchFn: typeof fetch): Promise<Array<{ platform: string; url: string }>> {
	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), MB_TIMEOUT_MS);
	try {
		const resp = await fetchFn(
			`https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
			{
				headers: { 'User-Agent': 'Mercury/0.1.0 (https://github.com/user/mercury)', Accept: 'application/json' },
				signal: controller.signal
			}
		);
		if (!resp.ok) return [];
		const data = (await resp.json()) as {
			relations?: Array<{ 'target-type'?: string; url?: { resource?: string } }>;
		};
		const { detectPlatform } = await import('$lib/embeds/categorize');
		const links: Array<{ platform: string; url: string }> = [];
		const seenPlatforms = new Set<string>();
		for (const rel of data.relations ?? []) {
			if (rel['target-type'] === 'url' && rel.url?.resource) {
				const platform = detectPlatform(rel.url.resource);
				if (platform && !seenPlatforms.has(platform)) {
					seenPlatforms.add(platform);
					links.push({ platform, url: rel.url.resource });
				}
			}
		}
		return links;
	} catch {
		return [];
	} finally {
		clearTimeout(t);
	}
}

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getArtistBySlug, getSimilarArtists, getArtistTagDistribution } = await import('$lib/db/queries');
		const db = await getProvider();

		const artist = await getArtistBySlug(db, params.slug);
		if (!artist) {
			return { artist: null, similarArtists: [], links: [], sortedTags: [], hasGeocoordinates: false };
		}

		const [similarArtists, geoRow, links, tagDist] = await Promise.all([
			getSimilarArtists(db, artist.id, 10),
			db.get<{ has_geo: number }>(
				`SELECT (city_lat IS NOT NULL AND city_lat != 0) as has_geo FROM artists WHERE id = ?`,
				artist.id
			),
			fetchStreamingLinks(artist.mbid, fetch),
			getArtistTagDistribution(db, artist.id).catch(() => [] as Awaited<ReturnType<typeof getArtistTagDistribution>>)
		]);

		// Sort by vote count DESC (most-defining tags first)
		const sortedTags = tagDist
			.slice()
			.sort((a, b) => b.count - a.count)
			.map(t => t.tag);

		const hasGeocoordinates = (geoRow?.has_geo ?? 0) === 1;

		return { artist, similarArtists, links, sortedTags, hasGeocoordinates };
	} catch {
		return { artist: null, similarArtists: [], links: [], sortedTags: [], hasGeocoordinates: false };
	}
};
