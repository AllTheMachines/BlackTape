/**
 * Streaming coordination state — tracks which streaming service (if any)
 * is currently active, and the user's service priority order.
 *
 * activeSource is set by EmbedPlayer when an embed begins playing,
 * and cleared when the embed iframe is destroyed.
 *
 * serviceOrder is loaded from ai_settings on app boot (see +layout.svelte)
 * and updated by the Settings → Streaming drag-to-reorder UI.
 *
 * When activeSource === 'spotify', a polling loop runs every 3 s against
 * GET /v1/me/player to keep spotifyTrack current. Control functions
 * (spotifyTogglePlayPause, spotifySkipNext, etc.) call the Spotify API
 * directly and optimistically update local state before the next poll.
 */

import {
	getCurrentPlayback,
	spotifyPause,
	spotifyResume,
	spotifyNext as apiNext,
	spotifyPrevious as apiPrevious,
	spotifySeek as apiSeek,
	spotifySetVolume as apiSetVolume,
	spotifySetShuffle as apiSetShuffle,
	spotifySetRepeat as apiSetRepeat,
	type CurrentPlaybackState
} from '$lib/spotify/api';
import { getValidAccessToken } from '$lib/spotify/auth';

export type StreamingSource = 'spotify' | 'soundcloud' | 'youtube' | 'bandcamp' | null;

export interface SpotifyTrackInfo extends CurrentPlaybackState {
	/** Date.now() at the time of the last successful poll. Used for interpolation. */
	lastPollTime: number;
}

export const streamingState = $state({
	activeSource: null as StreamingSource,
	/** Human-readable label for what's playing — set by Spotify Connect callers. */
	streamingLabel: null as string | null,
	serviceOrder: ['bandcamp', 'spotify', 'soundcloud', 'youtube'] as string[],
	/** Live track info from Spotify polling — null when Spotify is not active. */
	spotifyTrack: null as SpotifyTrackInfo | null
});

// ─── Polling ──────────────────────────────────────────────────────────────────

let _pollInterval: ReturnType<typeof setInterval> | null = null;

async function pollSpotify(): Promise<void> {
	try {
		const token = await getValidAccessToken();
		const state = await getCurrentPlayback(token);
		if (state) {
			streamingState.spotifyTrack = { ...state, lastPollTime: Date.now() };
		}
	} catch {
		// Token error or network failure — keep existing state until next poll.
	}
}

function startSpotifyPolling(): void {
	pollSpotify(); // immediate first poll — don't wait 3 s for first result
	_pollInterval = setInterval(pollSpotify, 3000);
}

function stopSpotifyPolling(): void {
	if (_pollInterval !== null) {
		clearInterval(_pollInterval);
		_pollInterval = null;
	}
	streamingState.spotifyTrack = null;
}

// ─── Source management ────────────────────────────────────────────────────────

/** Set the active streaming source. Optionally pass a label (e.g. artist name) for the player bar. */
export function setActiveSource(source: StreamingSource, label?: string): void {
	streamingState.activeSource = source;
	streamingState.streamingLabel = label ?? null;
	if (source === 'spotify') {
		startSpotifyPolling();
	} else {
		stopSpotifyPolling();
	}
}

/** Clear the active streaming source. */
export function clearActiveSource(): void {
	stopSpotifyPolling();
	streamingState.activeSource = null;
	streamingState.streamingLabel = null;
}

// ─── Spotify controls ─────────────────────────────────────────────────────────

/**
 * Toggle play/pause on Spotify Desktop.
 * Optimistically flips isPlaying so the UI responds instantly.
 */
export async function spotifyTogglePlayPause(): Promise<void> {
	const track = streamingState.spotifyTrack;
	if (!track) return;
	try {
		const token = await getValidAccessToken();
		if (track.isPlaying) {
			streamingState.spotifyTrack!.isPlaying = false;
			await spotifyPause(token);
		} else {
			streamingState.spotifyTrack!.isPlaying = true;
			streamingState.spotifyTrack!.lastPollTime = Date.now();
			await spotifyResume(token);
		}
	} catch {
		/* silently swallow — next poll will correct state */
	}
}

/**
 * Skip to the next Spotify track.
 * Polls immediately after 400 ms so the new track name appears quickly.
 */
export async function spotifySkipNext(): Promise<void> {
	try {
		const token = await getValidAccessToken();
		await apiNext(token);
		setTimeout(pollSpotify, 400);
	} catch {
		/* ignore */
	}
}

/**
 * Skip to the previous Spotify track.
 * Polls immediately after 400 ms so the new track name appears quickly.
 */
export async function spotifySkipPrevious(): Promise<void> {
	try {
		const token = await getValidAccessToken();
		await apiPrevious(token);
		setTimeout(pollSpotify, 400);
	} catch {
		/* ignore */
	}
}

/**
 * Seek to a position (in milliseconds) within the current Spotify track.
 * Optimistically updates local progress so the seek bar feels instant.
 */
export async function spotifySeek(positionMs: number): Promise<void> {
	if (streamingState.spotifyTrack) {
		streamingState.spotifyTrack.progressMs = positionMs;
		streamingState.spotifyTrack.lastPollTime = Date.now();
	}
	try {
		const token = await getValidAccessToken();
		await apiSeek(positionMs, token);
	} catch {
		/* ignore */
	}
}

/**
 * Set Spotify volume (0–100).
 * Optimistically updates local state so the slider feels instant.
 */
export async function spotifySetVolume(volumePercent: number): Promise<void> {
	if (streamingState.spotifyTrack) {
		streamingState.spotifyTrack.volumePercent = volumePercent;
	}
	try {
		const token = await getValidAccessToken();
		await apiSetVolume(volumePercent, token);
	} catch {
		/* ignore */
	}
}

/** Volume level saved before muting, to restore on unmute. */
let _preMuteVolume = 50;

/**
 * Toggle Spotify mute by setting volume to 0 or restoring previous level.
 */
export async function spotifyToggleMute(): Promise<void> {
	const track = streamingState.spotifyTrack;
	if (!track) return;
	if (track.volumePercent > 0) {
		_preMuteVolume = track.volumePercent;
		await spotifySetVolume(0);
	} else {
		await spotifySetVolume(_preMuteVolume || 50);
	}
}

/**
 * Toggle Spotify shuffle on/off.
 * Optimistically flips the local state so the button responds instantly.
 */
export async function spotifyToggleShuffle(): Promise<void> {
	const track = streamingState.spotifyTrack;
	if (!track) return;
	const next = !track.shuffleState;
	streamingState.spotifyTrack!.shuffleState = next;
	try {
		const token = await getValidAccessToken();
		await apiSetShuffle(next, token);
	} catch {
		/* ignore */
	}
}

/** Cycle Spotify repeat: off → context → track → off */
export async function spotifyCycleRepeat(): Promise<void> {
	const track = streamingState.spotifyTrack;
	if (!track) return;
	const order: Array<'off' | 'context' | 'track'> = ['off', 'context', 'track'];
	const next = order[(order.indexOf(track.repeatState) + 1) % order.length];
	streamingState.spotifyTrack!.repeatState = next;
	try {
		const token = await getValidAccessToken();
		await apiSetRepeat(next, token);
	} catch {
		/* ignore */
	}
}
