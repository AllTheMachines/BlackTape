import type { PageLoad } from './$types';
import { isTauri } from '$lib/platform';

export const load: PageLoad = async ({ data }) => {
	if (!isTauri()) {
		// Web: pass server data through unchanged
		return { ...data };
	}

	// Tauri: query local DB with taste tags for personalized starting graph
	try {
		const { getProvider } = await import('$lib/db/provider');
		const { getStarterGenreGraph } = await import('$lib/db/queries');
		const { tasteProfile } = await import('$lib/taste/profile.svelte');
		const db = await getProvider();
		// Use top 5 taste tags — empty array falls back to top-connected genres naturally
		const tasteTags = tasteProfile.tags.map((t) => t.tag).slice(0, 5);
		const graph = await getStarterGenreGraph(db, tasteTags);
		return { graph };
	} catch {
		return { ...data };
	}
};
