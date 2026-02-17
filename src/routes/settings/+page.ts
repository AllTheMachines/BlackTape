/**
 * Settings page load — universal load function.
 * Settings are loaded client-side from Tauri invokes, not from server data.
 */

export function load() {
	return {
		title: 'Settings'
	};
}
