import type { PageLoad } from './$types';
import { isTauri } from '$lib/platform';
import type { CrateFilters } from '$lib/db/queries';

export const load: PageLoad = async ({ url }) => {
	const tag = url.searchParams.get('tag') ?? undefined;
	const decadeMin = url.searchParams.get('decadeMin')
		? parseInt(url.searchParams.get('decadeMin')!)
		: undefined;
	const decadeMax = url.searchParams.get('decadeMax')
		? parseInt(url.searchParams.get('decadeMax')!)
		: undefined;
	const country = url.searchParams.get('country') ?? undefined;

	const filters: CrateFilters = { tag, decadeMin, decadeMax, country };

	if (!isTauri()) {
		return { artists: [], filters, isTauri: false };
	}

	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getCrateDigArtists } = await import('$lib/db/queries');
		const db = await getProvider();
		const artists = await getCrateDigArtists(db, filters, 20);
		return { artists, filters, isTauri: true };
	} catch (e) {
		console.error('Crate dig error:', e);
		return { artists: [], filters, isTauri: true };
	}
};
