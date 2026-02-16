/**
 * Player state — Svelte 5 runes-based reactive state for the audio player.
 *
 * All components import and read/write this directly.
 * Uses module-level $state for global reactivity.
 */

export interface PlayerTrack {
	path: string;
	title: string;
	artist: string;
	album: string;
	albumArtist?: string;
	trackNumber?: number;
	discNumber?: number;
	genre?: string;
	year?: number;
	durationSecs: number;
}

export const playerState = $state({
	currentTrack: null as PlayerTrack | null,
	isPlaying: false,
	currentTime: 0,
	duration: 0,
	volume: 1,
	isMuted: false,
	isLoading: false
});
