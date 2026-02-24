/**
 * Navigation progress state for Tauri desktop.
 *
 * Extends SvelteKit's $navigating store to cover Tauri invoke() data loads
 * that happen after the router has already marked navigation complete.
 *
 * Usage in page load functions:
 *   import { startProgress, completeProgress } from '$lib/nav-progress.svelte';
 *   export async function load() {
 *     if (isTauri()) startProgress();
 *     try {
 *       // ... load logic ...
 *     } finally {
 *       if (isTauri()) completeProgress();
 *     }
 *   }
 */

export let navProgress = $state({ active: false, completing: false });

let _minTimer: ReturnType<typeof setTimeout> | null = null;

/** Start showing the progress bar. Clears any pending completion timer. */
export function startProgress() {
  if (_minTimer) {
    clearTimeout(_minTimer);
    _minTimer = null;
  }
  navProgress.active = true;
  navProgress.completing = false;
}

/**
 * Signal that loading is complete. Bar snaps to 100% and fades out
 * after a minimum display time of 180ms (avoids invisible flash on fast loads).
 */
export function completeProgress() {
  navProgress.completing = true;
  _minTimer = setTimeout(() => {
    navProgress.active = false;
    navProgress.completing = false;
    _minTimer = null;
  }, 180);
}
