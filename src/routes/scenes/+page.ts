import type { PageLoad } from './$types';

// Scene detection runs in onMount in +page.svelte (Tauri client only).
// This load function just passes through server data for the web path.
export const load: PageLoad = async ({ data }) => {
	return { scenes: data.scenes };
};
