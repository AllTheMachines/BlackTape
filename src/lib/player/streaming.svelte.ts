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
	serviceOrder: ['bandcamp', 'spotify', 'soundcloud', 'youtube'] as string[]
});

/** Set the active streaming source. Call when an embed iframe begins playing. */
export function setActiveSource(source: StreamingSource): void {
	streamingState.activeSource = source;
}

/** Clear the active streaming source. Call when an embed iframe is destroyed. */
export function clearActiveSource(): void {
	streamingState.activeSource = null;
}
