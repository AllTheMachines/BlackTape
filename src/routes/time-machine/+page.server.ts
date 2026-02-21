import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { getArtistsByYear } from '$lib/db/queries';

const DEFAULT_YEAR = new Date().getFullYear() - 30; // e.g. 1995 in 2025

export const load: PageServerLoad = async ({ url, platform }) => {
	const year = parseInt(url.searchParams.get('year') ?? String(DEFAULT_YEAR), 10);

	if (!platform?.env?.DB) {
		return { artists: [], year };
	}
	const db = new D1Provider(platform.env.DB);
	const artists = await getArtistsByYear(db, year, undefined, 50);
	return { artists, year };
};
