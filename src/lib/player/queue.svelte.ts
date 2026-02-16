/**
 * Queue management — track queue with shuffle, repeat, and navigation.
 *
 * Uses Svelte 5 runes for reactive queue state.
 * Calls into audio.svelte.ts for actual playback.
 */

import type { PlayerTrack } from './state.svelte';
import { playerState } from './state.svelte';
import { playTrack, seek } from './audio.svelte';

export const queueState = $state({
	tracks: [] as PlayerTrack[],
	currentIndex: -1,
	shuffled: false,
	repeatMode: 'none' as 'none' | 'all' | 'one'
});

/**
 * Set the queue and start playing from a given index.
 */
export function setQueue(tracks: PlayerTrack[], startIndex?: number): void {
	queueState.tracks = [...tracks];
	queueState.currentIndex = startIndex ?? 0;

	if (queueState.tracks.length > 0 && queueState.currentIndex < queueState.tracks.length) {
		playTrack(queueState.tracks[queueState.currentIndex]);
	}
}

/**
 * Append a track to the end of the queue.
 */
export function addToQueue(track: PlayerTrack): void {
	queueState.tracks = [...queueState.tracks, track];
}

/**
 * Insert a track immediately after the currently playing track.
 */
export function addToQueueNext(track: PlayerTrack): void {
	const insertAt = queueState.currentIndex + 1;
	const newTracks = [...queueState.tracks];
	newTracks.splice(insertAt, 0, track);
	queueState.tracks = newTracks;
}

/**
 * Play the next track in the queue.
 * Handles repeat modes (one, all, none).
 */
export function playNext(): void {
	if (queueState.tracks.length === 0) return;

	if (queueState.repeatMode === 'one') {
		// Replay current track
		const current = queueState.tracks[queueState.currentIndex];
		if (current) {
			playTrack(current);
		}
		return;
	}

	const nextIndex = queueState.currentIndex + 1;

	if (nextIndex >= queueState.tracks.length) {
		if (queueState.repeatMode === 'all') {
			// Wrap around to the beginning
			queueState.currentIndex = 0;
			playTrack(queueState.tracks[0]);
		} else {
			// End of queue, stop
			playerState.isPlaying = false;
		}
		return;
	}

	queueState.currentIndex = nextIndex;
	playTrack(queueState.tracks[nextIndex]);
}

/**
 * Play the previous track.
 * If more than 3 seconds into the current track, restart it instead.
 */
export function playPrevious(): void {
	if (queueState.tracks.length === 0) return;

	// If more than 3 seconds in, restart current track
	if (playerState.currentTime > 3) {
		seek(0);
		return;
	}

	const prevIndex = Math.max(0, queueState.currentIndex - 1);
	queueState.currentIndex = prevIndex;
	playTrack(queueState.tracks[prevIndex]);
}

/**
 * Remove a track from the queue by index.
 * Adjusts currentIndex if needed.
 */
export function removeFromQueue(index: number): void {
	if (index < 0 || index >= queueState.tracks.length) return;

	const newTracks = [...queueState.tracks];
	newTracks.splice(index, 1);
	queueState.tracks = newTracks;

	// Adjust current index
	if (index < queueState.currentIndex) {
		queueState.currentIndex--;
	} else if (index === queueState.currentIndex) {
		// Removed the currently playing track
		if (queueState.currentIndex >= newTracks.length) {
			queueState.currentIndex = Math.max(0, newTracks.length - 1);
		}
	}
}

/**
 * Clear the entire queue.
 */
export function clearQueue(): void {
	queueState.tracks = [];
	queueState.currentIndex = -1;
}

/**
 * Toggle shuffle mode.
 */
export function toggleShuffle(): void {
	queueState.shuffled = !queueState.shuffled;
}

/**
 * Cycle repeat mode: none -> all -> one -> none.
 */
export function toggleRepeat(): void {
	const modes: Array<'none' | 'all' | 'one'> = ['none', 'all', 'one'];
	const currentIdx = modes.indexOf(queueState.repeatMode);
	queueState.repeatMode = modes[(currentIdx + 1) % modes.length];
}
