import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { getStyleMapData } from '$lib/db/queries';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { nodes: [], edges: [] };
	}
	const db = new D1Provider(platform.env.DB);
	try {
		const { nodes, edges } = await getStyleMapData(db, 50);
		return { nodes, edges };
	} catch {
		// tag_stats/tag_cooccurrence tables not yet populated — show empty state
		return { nodes: [], edges: [] };
	}
};
