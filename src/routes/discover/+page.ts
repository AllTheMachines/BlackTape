/**
 * Universal load function for the Discover page.
 *
 * Coexists with +page.server.ts:
 * - Web (SSR): SvelteKit runs +page.server.ts on the server, passes its
 *   return value as `data`. This function returns it unchanged.
 * - Desktop (Tauri SPA, ssr=false): +page.server.ts is not executed.
 *   This function detects Tauri and queries the local SQLite database.
 *
 * Dynamic imports keep Tauri dependencies out of the web bundle.
 */

import type { PageLoad } from './$types';
import { isTauri } from '$lib/platform';

export const load: PageLoad = async ({ url, data }) => {
	const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

	if (!isTauri()) {
		return { ...data, tags }; // Web: server data already loaded
	}

	// Desktop: query local SQLite
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
