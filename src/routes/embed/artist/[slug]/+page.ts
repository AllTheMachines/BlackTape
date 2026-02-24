import type { PageLoad } from './$types';
import type { Artist } from '$lib/db/queries';

// Embed routes are web-only widgets for external websites.
// In the Tauri desktop app this route is unreachable, but we provide an
// empty data shape so the page renders gracefully if somehow navigated to.
export const load: PageLoad = async () => {
	return {
		artist: null as Artist | null,
		tags: [] as string[],
		coverArt: '',
		bio: null as string | null,
		siteUrl: '',
		curators: [] as Array<{ curator_handle: string }>
	};
};
