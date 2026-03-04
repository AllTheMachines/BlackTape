import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getArtistsByTagRandom, getRelatedTags, getGenreBySlug } = await import(
			'$lib/db/queries'
		);
		const db = await getProvider();

		// Decode URL-encoded slug back to raw tag string
		const tag = decodeURIComponent(params.slug);

		const [artists, relatedTags, genre] = await Promise.all([
			getArtistsByTagRandom(db, tag, 20),
			getRelatedTags(db, tag, 12),
			getGenreBySlug(db, params.slug).catch(() => null)
		]);

		return { tag, artists, relatedTags, genre: genre ?? null };
	} catch {
		return {
			tag: decodeURIComponent(params.slug),
			artists: [],
			relatedTags: [],
			genre: null
		};
	}
};
