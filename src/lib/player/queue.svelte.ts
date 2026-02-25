/**
 * Queue management — track queue with shuffle, repeat, and navigation.
 *
 * Uses Svelte 5 runes for reactive queue state.
 * Calls into audio.svelte.ts for actual playback.
 * Persists queue to localStorage — survives app restarts.
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

// ─── Persistence ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mercury:queue';

/**
 * Serialize queue state to localStorage.
 * Called after every mutation.
 */
function saveQueueToStorage(): void {
	if (typeof window === 'undefined') return;
	try {
		const data = {
			tracks: queueState.tracks,
			currentIndex: queueState.currentIndex
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch {
		// Storage may be unavailable (private browsing, quota exceeded) — ignore
	}
}

/**
 * Deserialize queue from localStorage and restore state.
 * Sets currentTrack from restored index but does NOT auto-play.
 */
function loadQueueFromStorage(): void {
	if (typeof window === 'undefined') return;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;

		const data = JSON.parse(raw) as { tracks: PlayerTrack[]; currentIndex: number };
		if (!Array.isArray(data.tracks)) return;

		queueState.tracks = data.tracks;
		queueState.currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : -1;

		// Restore currentTrack to the stored index but do NOT auto-play
		if (
			queueState.currentIndex >= 0 &&
			queueState.currentIndex < queueState.tracks.length
		) {
			playerState.currentTrack = queueState.tracks[queueState.currentIndex];
			playerState.isPlaying = false;
		}
	} catch {
		// Corrupt data — ignore silently
	}
}

/**
 * Restore queue from localStorage.
 * Call this from the root layout on mount.
 */
export function restoreQueueFromStorage(): void {
	loadQueueFromStorage();
}

// ─── Queue mutations ─────────────────────────────────────────────────────────

/**
 * Set the queue and start playing from a given index.
 */
export function setQueue(tracks: PlayerTrack[], startIndex?: number): void {
	queueState.tracks = [...tracks];
	queueState.currentIndex = startIndex ?? 0;

	if (queueState.tracks.length > 0 && queueState.currentIndex < queueState.tracks.length) {
		playTrack(queueState.tracks[queueState.currentIndex]);
	}

	saveQueueToStorage();
}

/**
 * Append a track to the end of the queue.
 */
export function addToQueue(track: PlayerTrack): void {
	queueState.tracks = [...queueState.tracks, track];
	saveQueueToStorage();
}

/**
 * Insert a track immediately after the currently playing track.
 */
export function addToQueueNext(track: PlayerTrack): void {
	const insertAt = queueState.currentIndex + 1;
	const newTracks = [...queueState.tracks];
	newTracks.splice(insertAt, 0, track);
	queueState.tracks = newTracks;
	saveQueueToStorage();
}

/**
 * Insert a track after the current position and immediately play it.
 * Used when the user clicks Play on a track row while something is already playing.
 * Does NOT replace the queue — preserves context and resumes after the inserted track.
 */
export function playNextInQueue(track: PlayerTrack): void {
	const insertAt = queueState.currentIndex + 1;
	const newTracks = [...queueState.tracks];
	newTracks.splice(insertAt, 0, track);
	queueState.tracks = newTracks;
	queueState.currentIndex = insertAt;
	playTrack(track);
	saveQueueToStorage();
}

/**
 * Returns true when the queue has tracks and playback is active.
 * Used by TrackRow to decide between playNextInQueue and setQueue.
 */
export function isQueueActive(): boolean {
	return queueState.tracks.length > 0 && playerState.isPlaying;
}

/**
 * Reorder the queue by moving a track from one index to another.
 * Adjusts currentIndex to keep the same track playing after the reorder.
 * Used by Queue.svelte for drag-reorder.
 */
export function reorderQueue(from: number, to: number): void {
	const newTracks = [...queueState.tracks];
	const [moved] = newTracks.splice(from, 1);
	newTracks.splice(to, 0, moved);
	queueState.tracks = newTracks;

	if (queueState.currentIndex === from) {
		queueState.currentIndex = to;
	} else if (from < queueState.currentIndex && to >= queueState.currentIndex) {
		queueState.currentIndex--;
	} else if (from > queueState.currentIndex && to <= queueState.currentIndex) {
		queueState.currentIndex++;
	}

	saveQueueToStorage();
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
		saveQueueToStorage();
		return;
	}

	queueState.currentIndex = nextIndex;
	playTrack(queueState.tracks[nextIndex]);
	saveQueueToStorage();
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
	saveQueueToStorage();
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

	saveQueueToStorage();
}

/**
 * Clear the entire queue.
 */
export function clearQueue(): void {
	queueState.tracks = [];
	queueState.currentIndex = -1;
	saveQueueToStorage();
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
