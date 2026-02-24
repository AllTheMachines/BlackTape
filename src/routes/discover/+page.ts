import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getPopularTags, getArtistsByTagIntersection, getDiscoveryRankedArtists } =
			await import('$lib/db/queries');

		const db = await getProvider();
		const [popularTags, artists] = await Promise.all([
			getPopularTags(db, 100),
			tags.length > 0
				? getArtistsByTagIntersection(db, tags, 50)
				: getDiscoveryRankedArtists(db, 50)
		]);

		return { popularTags, artists, tags };
	} catch (e) {
		console.error('Discover page load error:', e);
		return { popularTags: [], artists: [], tags };
	}
};
