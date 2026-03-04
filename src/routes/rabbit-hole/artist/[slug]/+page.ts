import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getArtistBySlug, getSimilarArtists } = await import('$lib/db/queries');
		const db = await getProvider();

		const artist = await getArtistBySlug(db, params.slug);
		if (!artist) {
			return { artist: null, similarArtists: [], links: [] };
		}

		const [similarArtists, linksRaw, geoRow] = await Promise.all([
			getSimilarArtists(db, artist.id, 10),
			db.all<{ platform: string; url: string }>(
				`SELECT platform, url FROM artist_links WHERE artist_id = ? ORDER BY platform`,
				artist.id
			),
			db.get<{ has_geo: number }>(
				`SELECT (city_lat IS NOT NULL AND city_lat != 0) as has_geo FROM artists WHERE id = ?`,
				artist.id
			)
		]);

		const hasGeocoordinates = (geoRow?.has_geo ?? 0) === 1;

		return { artist, similarArtists, links: linksRaw, hasGeocoordinates };
	} catch {
		return { artist: null, similarArtists: [], links: [], hasGeocoordinates: false };
	}
};
