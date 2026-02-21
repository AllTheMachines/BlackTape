import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { getArtistsByYear } from '$lib/db/queries';

export const GET: RequestHandler = async ({ url, platform }) => {
	const year = parseInt(url.searchParams.get('year') ?? '1990', 10);
	const tag = url.searchParams.get('tag') ?? undefined;

	if (isNaN(year) || year < 1900 || year > 2030) {
		return json({ artists: [], year }, { status: 400 });
	}

	const db = new D1Provider(platform!.env.DB);
	const artists = await getArtistsByYear(db, year, tag, 50);
	return json({ artists, year });
};
