/**
 * Platform detection utility.
 *
 * Tauri 2.x injects `__TAURI_INTERNALS__` into the webview's window object.
 * This check is reliable and doesn't require importing from @tauri-apps/api
 * (which would fail or pull in unnecessary dependencies in the web build).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;

/**
 * Returns true when running inside a Tauri 2.x webview.
 * Always returns false during SSR (no `window`).
 */
export function isTauri(): boolean {
	return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
}
