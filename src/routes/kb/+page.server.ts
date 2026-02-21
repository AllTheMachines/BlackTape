import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { getStarterGenreGraph } from '$lib/db/queries';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { graph: { nodes: [], edges: [] } };
	}
	const db = new D1Provider(platform.env.DB);
	try {
		// No taste tags on web (no local profile) — use top-connected genres
		const graph = await getStarterGenreGraph(db, []);
		return { graph };
	} catch {
		// genres table not yet populated — show empty state
		return { graph: { nodes: [], edges: [] } };
	}
};
