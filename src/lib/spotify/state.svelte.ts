/**
 * Spotify connection state — reactive module-level $state.
 *
 * Mirrors the pattern used in streaming.svelte.ts and playerState:
 * no class, no store — plain $state at module level.
 *
 * spotifyState is read by any component that needs to check connected
 * status or access the current access token.
 *
 * setSpotifyConnected() — called after successful OAuth + token load.
 * clearSpotifyState() — called on disconnect or token clear.
 */

export interface SpotifyStoredState {
	accessToken: string;
	refreshToken: string;
	tokenExpiry: number; // Unix ms
	clientId: string;
	displayName: string;
}

export const spotifyState = $state({
	connected: false,
	displayName: '' as string,
	accessToken: '' as string,
	refreshToken: '' as string,
	tokenExpiry: 0 as number,
	clientId: '' as string
});

/** Mark Spotify as connected, populating all token fields. */
export function setSpotifyConnected(data: SpotifyStoredState): void {
	spotifyState.connected = true;
	spotifyState.displayName = data.displayName;
	spotifyState.accessToken = data.accessToken;
	spotifyState.refreshToken = data.refreshToken;
	spotifyState.tokenExpiry = data.tokenExpiry;
	spotifyState.clientId = data.clientId;
}

/** Clear all Spotify state — call on disconnect or auth failure. */
export function clearSpotifyState(): void {
	spotifyState.connected = false;
	spotifyState.displayName = '';
	spotifyState.accessToken = '';
	spotifyState.refreshToken = '';
	spotifyState.tokenExpiry = 0;
	spotifyState.clientId = '';
}
