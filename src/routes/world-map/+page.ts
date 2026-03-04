import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const artistSlug = url.searchParams.get('artist');
	const tagFilter = url.searchParams.get('tag');

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getGeocodedArtists } = await import('$lib/db/queries');
		const db = await getProvider();
		const artists = await getGeocodedArtists(db, 50000);
		return { artists, artistSlug, tagFilter };
	} catch {
		return { artists: [], artistSlug, tagFilter };
	}
};
