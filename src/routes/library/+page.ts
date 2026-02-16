/**
 * Library page load — loads library data in Tauri context only.
 */

import { isTauri } from '$lib/platform';

export async function load() {
	if (isTauri()) {
		const { loadLibrary } = await import('$lib/library/store.svelte');
		await loadLibrary();
	}

	return {
		title: 'Library'
	};
}
