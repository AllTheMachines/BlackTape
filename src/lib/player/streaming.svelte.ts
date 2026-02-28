/**
 * Streaming coordination state — tracks which streaming service (if any)
 * is currently active, and the user's service priority order.
 *
 * activeSource is set by EmbedPlayer when an embed begins playing,
 * and cleared when the embed iframe is destroyed.
 *
 * serviceOrder is loaded from ai_settings on app boot (see +layout.svelte)
 * and updated by the Settings → Streaming drag-to-reorder UI.
 */

export type StreamingSource = 'spotify' | 'soundcloud' | 'youtube' | 'bandcamp' | null;

export const streamingState = $state({
	activeSource: null as StreamingSource,
	/** Human-readable label for what's playing — set by Spotify Connect callers. */
	streamingLabel: null as string | null,
	serviceOrder: ['bandcamp', 'spotify', 'soundcloud', 'youtube'] as string[]
});

/** Set the active streaming source. Optionally pass a label (e.g. artist name) for the player bar. */
export function setActiveSource(source: StreamingSource, label?: string): void {
	streamingState.activeSource = source;
	streamingState.streamingLabel = label ?? null;
}

/** Clear the active streaming source. */
export function clearActiveSource(): void {
	streamingState.activeSource = null;
	streamingState.streamingLabel = null;
}
