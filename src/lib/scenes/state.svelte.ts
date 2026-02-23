/**
 * Reactive scene state management using Svelte 5 runes.
 *
 * Holds the detected scenes list and loading/error state for consumers.
 * Supports lazy load from cache and forced re-detection.
 */

import type { DetectedScene, PartitionedScenes } from './types';

interface ScenesState {
	scenes: DetectedScene[];
	partitioned: PartitionedScenes;
	isLoaded: boolean;
	isDetecting: boolean;
	error: string | null;
}

export const scenesState: ScenesState = $state({
	scenes: [],
	partitioned: { active: [], emerging: [] },
	isLoaded: false,
	isDetecting: false,
	error: null
});

/**
 * Load scenes — tries cache first, falls back to full detection.
 * Pass forceDetect=true to skip cache and run the full algorithm.
 * Idempotent: returns early if already detecting.
 */
export async function loadScenes(forceDetect = false): Promise<void> {
	if (scenesState.isDetecting) return; // idempotent guard
	scenesState.isDetecting = true;
	scenesState.error = null;

	try {
		const { loadCachedScenes, detectScenes, partitionScenes } = await import('./detection');

		// Try cache first (unless forceDetect)
		let scenes: DetectedScene[] = [];
		if (!forceDetect) {
			scenes = await loadCachedScenes();
		}

		// If cache empty or forced, run detection
		if (scenes.length === 0 || forceDetect) {
			scenes = await detectScenes();
		}

		scenesState.scenes = scenes;
		scenesState.partitioned = partitionScenes(scenes);
		scenesState.isLoaded = true;
	} catch (e) {
		scenesState.error = e instanceof Error ? e.message : 'Scene detection failed';
		scenesState.isLoaded = true; // still "loaded" — just empty
	} finally {
		scenesState.isDetecting = false;
	}
}
