/**
 * Audio engine — HTML5 Audio with Tauri convertFileSrc for local file playback.
 *
 * Creates a module-scoped HTMLAudioElement lazily on first use (browser only).
 * All playback control goes through this module.
 */

import { playerState, type PlayerTrack } from './state.svelte';

let audio: HTMLAudioElement | null = null;
let previousVolume = 1;

/**
 * Lazily create and configure the HTMLAudioElement.
 * Attaches all event listeners that sync with playerState.
 */
function initAudio(): HTMLAudioElement {
	if (typeof window === 'undefined') {
		throw new Error('Cannot initialize audio in SSR context');
	}

	if (audio) return audio;

	audio = new Audio();

	audio.addEventListener('timeupdate', () => {
		playerState.currentTime = audio!.currentTime;
	});

	audio.addEventListener('loadedmetadata', () => {
		playerState.duration = audio!.duration;
		playerState.isLoading = false;
	});

	audio.addEventListener('ended', () => {
		// Dynamically import to avoid circular dependency at module level
		import('./queue.svelte').then(({ playNext }) => {
			playNext();
		});
	});

	audio.addEventListener('play', () => {
		playerState.isPlaying = true;
	});

	audio.addEventListener('pause', () => {
		playerState.isPlaying = false;
	});

	audio.addEventListener('waiting', () => {
		playerState.isLoading = true;
	});

	audio.addEventListener('canplay', () => {
		playerState.isLoading = false;
	});

	return audio;
}

/**
 * Play a track by converting its local file path to an asset:// URL via convertFileSrc.
 */
export async function playTrack(track: PlayerTrack): Promise<void> {
	if (typeof window === 'undefined') return;

	const el = initAudio();
	const { convertFileSrc } = await import('@tauri-apps/api/core');
	const url = convertFileSrc(track.path);

	playerState.isLoading = true;
	playerState.currentTrack = track;

	el.src = url;
	await el.play();
}

/**
 * Pause playback.
 */
export function pause(): void {
	if (typeof window === 'undefined' || !audio) return;
	audio.pause();
}

/**
 * Resume playback.
 */
export function resume(): void {
	if (typeof window === 'undefined' || !audio) return;
	audio.play();
}

/**
 * Toggle between play and pause.
 */
export function togglePlayPause(): void {
	if (typeof window === 'undefined' || !audio) return;

	if (audio.paused) {
		audio.play();
	} else {
		audio.pause();
	}
}

/**
 * Seek to a specific position in seconds.
 */
export function seek(seconds: number): void {
	if (typeof window === 'undefined' || !audio) return;
	audio.currentTime = seconds;
}

/**
 * Set the volume (0-1, clamped).
 */
export function setVolume(vol: number): void {
	if (typeof window === 'undefined') return;

	const el = initAudio();
	const clamped = Math.max(0, Math.min(1, vol));
	el.volume = clamped;
	playerState.volume = clamped;

	if (clamped > 0) {
		playerState.isMuted = false;
	}
}

/**
 * Toggle mute. Stores previous volume and restores on unmute.
 */
export function toggleMute(): void {
	if (typeof window === 'undefined') return;

	const el = initAudio();

	if (playerState.isMuted) {
		el.volume = previousVolume;
		playerState.volume = previousVolume;
		playerState.isMuted = false;
	} else {
		previousVolume = playerState.volume;
		el.volume = 0;
		playerState.volume = 0;
		playerState.isMuted = true;
	}
}

/**
 * Get the underlying HTMLAudioElement for external access (e.g. keyboard shortcuts).
 */
export function getAudioElement(): HTMLAudioElement | null {
	return audio;
}
