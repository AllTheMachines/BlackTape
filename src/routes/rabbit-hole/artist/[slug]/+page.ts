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

		const [similarArtists, linksRaw] = await Promise.all([
			getSimilarArtists(db, artist.id, 10),
			db.all<{ platform: string; url: string }>(
				`SELECT platform, url FROM artist_links WHERE artist_id = ? ORDER BY platform`,
				artist.id
			)
		]);

		return { artist, similarArtists, links: linksRaw };
	} catch {
		return { artist: null, similarArtists: [], links: [] };
	}
};
