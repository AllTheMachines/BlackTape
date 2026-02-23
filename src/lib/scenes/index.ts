/**
 * Barrel re-export for the scenes module.
 *
 * Consumers can import all scene types, state, and detection functions
 * from this single entry point.
 */

export * from './types';
export { scenesState, loadScenes } from './state.svelte';
export { detectScenes, partitionScenes, loadCachedScenes } from './detection';
