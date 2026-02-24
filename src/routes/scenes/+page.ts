import type { PageLoad } from './$types';

// Scene detection runs in onMount in +page.svelte (Tauri client only).
export const load: PageLoad = async () => {
	return { scenes: [] };
};
