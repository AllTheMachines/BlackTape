import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Web: scene detection requires taste.db (Tauri-only).
	// Return empty array — the +page.svelte will show the empty state.
	// Future: compute scenes from Nostr public data or D1 snapshot.
	return { scenes: [] };
};
