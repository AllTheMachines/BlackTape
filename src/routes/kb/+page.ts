import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getStarterGenreGraph } = await import('$lib/db/queries');
		const { tasteProfile } = await import('$lib/taste/profile.svelte');
		const db = await getProvider();
		const tasteTags = tasteProfile.tags.map((t) => t.tag).slice(0, 5);
		const graph = await getStarterGenreGraph(db, tasteTags);
		return { graph };
	} catch {
		return { graph: { nodes: [], edges: [] } };
	}
};
