/**
 * Playback tracking — private mode state and qualifying play recording.
 *
 * Uses .svelte.ts extension for Svelte 5 $state runes.
 * All Tauri invokes are dynamic imports to avoid web build failures.
 */

export interface PlayRecord {
	id: number;
	track_path: string;
	artist_name: string | null;
	track_title: string | null;
	album_name: string | null;
	played_at: number;
	duration_secs: number;
}

export const playbackState = $state({
	privateMode: false,
	totalQualifyingPlays: 0
});

/**
 * Load private mode setting and total play count from taste.db.
 * Called fire-and-forget from root layout onMount.
 */
export async function loadPlaybackSettings(): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const value = await invoke<string | null>('get_ai_setting', { key: 'private_listening' });
		playbackState.privateMode = value === 'true';
		const count = await invoke<number>('get_play_count');
		playbackState.totalQualifyingPlays = count;
	} catch {
		// Not in Tauri or taste.db not ready — defaults remain
	}
}

/**
 * Toggle private listening mode. Persists to taste.db.
 */
export async function togglePrivateMode(): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const newVal = !playbackState.privateMode;
		await invoke('set_ai_setting', { key: 'private_listening', value: String(newVal) });
		playbackState.privateMode = newVal;
	} catch {
		// Ignore in web context
	}
}

/**
 * Record a qualifying play (local file reached 70%+ threshold).
 * No-op if private mode is enabled.
 * Triggers recomputeTaste() after recording.
 */
export async function recordQualifyingPlay(track: {
	path: string;
	artist?: string | null;
	title?: string | null;
	album?: string | null;
	duration?: number;
}): Promise<void> {
	// Incognito — do nothing
	if (playbackState.privateMode) return;

	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('record_play', {
			trackPath: track.path,
			artistName: track.artist ?? null,
			trackTitle: track.title ?? null,
			albumName: track.album ?? null,
			durationSecs: track.duration ?? 0
		});

		playbackState.totalQualifyingPlays++;

		// Recompute taste after each qualifying play.
		// Per-track cadence is fine for personal library sizes.
		const { recomputeTaste } = await import('$lib/taste/signals');
		await recomputeTaste();

		// Refresh taste status so recommendations activate if now >= 5 plays
		const { loadTasteProfile } = await import('$lib/taste/profile.svelte');
		await loadTasteProfile();
	} catch (e) {
		console.error('Failed to record qualifying play:', e);
	}
}

/**
 * Record a qualifying embed play (SoundCloud widget event).
 * No-op if private mode is enabled.
 * Unlike local plays, embed plays only have artist name — no path/album.
 */
export async function recordEmbedPlay(info: { artistName?: string | null }): Promise<void> {
	if (playbackState.privateMode) return;

	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('record_play', {
			trackPath: 'embed:soundcloud',
			artistName: info.artistName ?? null,
			trackTitle: null,
			albumName: null,
			durationSecs: 0
		});

		playbackState.totalQualifyingPlays++;

		const { recomputeTaste } = await import('$lib/taste/signals');
		await recomputeTaste();

		const { loadTasteProfile } = await import('$lib/taste/profile.svelte');
		await loadTasteProfile();
	} catch {
		// Ignore
	}
}
