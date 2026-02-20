import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import {
	getPopularTags,
	getArtistsByTagIntersection,
	getDiscoveryRankedArtists
} from '$lib/db/queries';

export const load: PageServerLoad = async ({ url, platform }) => {
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

	// No D1 in Tauri dev mode — universal load (+page.ts) handles Tauri path
	if (!platform?.env?.DB) {
		return { popularTags: [], artists: [], tags };
	}

	const db = new D1Provider(platform.env.DB);

	try {
		const [popularTags, artists] = await Promise.all([
			getPopularTags(db, 100),
			tags.length > 0
				? getArtistsByTagIntersection(db, tags, 50)
				: getDiscoveryRankedArtists(db, 50)
		]);
		return { popularTags, artists, tags };
	} catch {
		// tag_stats table not yet populated — return empty, page shows graceful state
		return { popularTags: [], artists: [], tags };
	}
};
