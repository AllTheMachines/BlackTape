/**
 * Player module — public API barrel export.
 *
 * Usage:
 *   import { playerState, playTrack, queueState, setQueue } from '$lib/player';
 */

export { playerState, type PlayerTrack } from './state.svelte';

export {
	playTrack,
	pause,
	resume,
	togglePlayPause,
	seek,
	setVolume,
	toggleMute,
	getAudioElement
} from './audio.svelte';

export {
	queueState,
	setQueue,
	addToQueue,
	addToQueueNext,
	playNext,
	playPrevious,
	removeFromQueue,
	clearQueue,
	toggleShuffle,
	toggleRepeat
} from './queue.svelte';
