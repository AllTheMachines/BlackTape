import type { PageLoad } from './$types';
import { isTauri } from '$lib/platform';

export const load: PageLoad = async ({ data }) => {
	if (!isTauri()) {
		// Web: use server-computed scenes (currently empty, see +page.server.ts)
		return { scenes: data.scenes, partitioned: { active: [], emerging: [] } };
	}

	// Tauri: run scene detection (loads cache or detects fresh)
	const { loadScenes, scenesState, partitionScenes } = await import('$lib/scenes');
	await loadScenes();

	return {
		scenes: scenesState.scenes,
		partitioned: scenesState.partitioned
	};
};
