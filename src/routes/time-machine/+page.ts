import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data, url }) => {
	if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
		return data;
	}
	// Tauri: query local DB directly — no fetch('/api/time-machine') (no server in static build)
	try {
		const year = parseInt(url.searchParams.get('year') ?? String(data.year), 10);
		const { getProvider } = await import('$lib/db/provider');
		const { getArtistsByYear } = await import('$lib/db/queries');
		const db = await getProvider();
		const artists = await getArtistsByYear(db, year, undefined, 50);
		return { artists, year };
	} catch {
		return data;
	}
};
