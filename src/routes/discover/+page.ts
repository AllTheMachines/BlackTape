import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
	const country = url.searchParams.get('country') ?? '';
	const era = url.searchParams.get('era') ?? '';

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getPopularTags, getDiscoveryArtists } = await import('$lib/db/queries');

		const db = await getProvider();
		const [popularTags, artists] = await Promise.all([
			getPopularTags(db, 100),
			getDiscoveryArtists(db, { tags, country: country || undefined, era: era || undefined }, 50)
		]);

		return { popularTags, artists, tags, country, era };
	} catch (e) {
		console.error('Discover page load error:', e);
		return { popularTags: [], artists: [], tags, country, era };
	}
};
