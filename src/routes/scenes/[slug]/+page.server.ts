import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params: _params }) => {
	// Web: scenes are Tauri-detected. Return null — +page.ts handles display.
	return { scene: null, artists: [], topTracks: [] };
};
