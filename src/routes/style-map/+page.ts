import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getStyleMapData } = await import('$lib/db/queries');
		const db = await getProvider();
		const { nodes, edges } = await getStyleMapData(db, 50);
		return { nodes, edges };
	} catch (e) {
		console.error('Style map load error:', e);
		return { nodes: [], edges: [] };
	}
};
