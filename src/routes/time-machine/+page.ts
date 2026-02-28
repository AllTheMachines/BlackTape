import type { PageLoad } from './$types';

const DEFAULT_YEAR = new Date().getFullYear() - 30;

export const load: PageLoad = async ({ url }) => {
	const year = parseInt(url.searchParams.get('year') ?? String(DEFAULT_YEAR), 10);

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getArtistsByYear } = await import('$lib/db/queries');
		const db = await getProvider();
		const artists = await getArtistsByYear(db, year, undefined, 30, 0);
		return { artists, year };
	} catch {
		return { artists: [], year };
	}
};
