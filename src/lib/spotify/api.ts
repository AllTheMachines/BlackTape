/**
 * Spotify Connect API calls — typed error classes and playback control.
 *
 * This module covers artist-to-track resolution and Connect playback.
 * It does NOT use the Web Playback SDK — Widevine CDM is unavailable in
 * WebView2 (confirmed unresolved since 2018). Instead it controls the
 * user's running Spotify Desktop app via the Connect API.
 *
 * All functions accept an accessToken directly — callers should obtain
 * a fresh token via getValidAccessToken() from auth.ts.
 */

// ─── Error types ──────────────────────────────────────────────────────────────

export class SpotifyAuthError extends Error {
	constructor(message = 'Token expired') {
		super(message);
		this.name = 'SpotifyAuthError';
	}
}

export class SpotifyNotFoundError extends Error {
	constructor(message = 'Artist not found on Spotify') {
		super(message);
		this.name = 'SpotifyNotFoundError';
	}
}

// ─── Discriminated result type ────────────────────────────────────────────────

/**
 * Discriminated result returned by playTracksOnSpotify.
 *
 * 'ok'               — Playback started successfully (HTTP 204).
 * 'no_device'        — No active Spotify device found (HTTP 404 NO_ACTIVE_DEVICE,
 *                      or any unexpected network/runtime error).
 *                      Surface: "Open Spotify Desktop and start playing anything, then try again."
 * 'premium_required' — User does not have Spotify Premium (HTTP 403).
 *                      Surface: "Spotify Premium is required to play tracks from BlackTape."
 * 'token_expired'    — Access token is invalid or expired (HTTP 401).
 *                      Surface: "Spotify session expired — reconnect in Settings."
 */
export type PlayResult = 'ok' | 'no_device' | 'premium_required' | 'token_expired';

// ─── URL utilities ────────────────────────────────────────────────────────────

/**
 * Extract the Spotify artist ID from a MusicBrainz Spotify URL.
 *
 * Input:  "https://open.spotify.com/artist/4Z8W4fohXX484ULPew5ay1"
 * Returns: "4Z8W4fohXX484ULPew5ay1" or null if URL does not match.
 */
export function extractSpotifyArtistId(spotifyUrl: string): string | null {
	const match = spotifyUrl.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
	return match ? match[1] : null;
}

/**
 * Extract the Spotify album ID from a MusicBrainz Spotify URL.
 *
 * Input:  "https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE"
 * Returns: "6dVIqQ8qmQ5GBnJ9shOYGE" or null if URL does not match.
 */
export function extractSpotifyAlbumId(spotifyUrl: string): string | null {
	const match = spotifyUrl.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
	return match ? match[1] : null;
}

/**
 * Trigger playback of a Spotify album on the user's active device.
 *
 * Uses context_uri so Spotify queues the full album in order.
 * Returns a discriminated PlayResult — never throws.
 */
export async function playAlbumOnSpotify(albumId: string, accessToken: string): Promise<PlayResult> {
	try {
		const res = await fetch('https://api.spotify.com/v1/me/player/play', {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ context_uri: `spotify:album:${albumId}` })
		});

		if (res.status === 204) return 'ok';
		if (res.status === 401) return 'token_expired';
		if (res.status === 403) return 'premium_required';
		if (res.status === 404) return 'no_device';

		return 'no_device';
	} catch {
		return 'no_device';
	}
}

// ─── Spotify API response interfaces ─────────────────────────────────────────

interface SpotifyTrack {
	uri: string;
}

interface TopTracksResponse {
	tracks: SpotifyTrack[];
}

interface SpotifyErrorResponse {
	error?: {
		status: number;
		reason?: string;
	};
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Get the top track URIs for a Spotify artist (up to 10).
 *
 * Uses market=from_token so the result matches the user's region without
 * requiring the caller to know the user's country code.
 *
 * Throws SpotifyAuthError on 401.
 * Throws SpotifyNotFoundError on 404.
 * Throws Error on other unexpected responses.
 */
export async function getArtistTopTracks(
	spotifyArtistId: string,
	accessToken: string
): Promise<string[]> {
	const url = `https://api.spotify.com/v1/artists/${spotifyArtistId}/top-tracks?market=from_token`;

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (res.status === 401) throw new SpotifyAuthError();
	if (res.status === 404) throw new SpotifyNotFoundError();
	if (!res.ok) throw new Error(`Spotify top-tracks request failed: ${res.status}`);

	const data = (await res.json()) as TopTracksResponse;
	return data.tracks.map((t) => t.uri);
}

/**
 * Trigger playback of track URIs on the user's active Spotify device.
 *
 * Sends at most 10 URIs (Spotify Connect limit).
 * Returns a discriminated PlayResult — never throws.
 *
 * Callers should present user-facing messages based on the result:
 * - 'no_device':        "Open Spotify Desktop and start playing anything, then try again."
 * - 'premium_required': "Spotify Premium is required to play tracks from BlackTape."
 * - 'token_expired':    "Spotify session expired — reconnect in Settings."
 */
export async function playTracksOnSpotify(
	trackUris: string[],
	accessToken: string
): Promise<PlayResult> {
	try {
		const res = await fetch('https://api.spotify.com/v1/me/player/play', {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ uris: trackUris.slice(0, 10) })
		});

		if (res.status === 204) return 'ok';
		if (res.status === 401) return 'token_expired';
		if (res.status === 403) return 'premium_required';

		if (res.status === 404) {
			// Confirm the 404 is NO_ACTIVE_DEVICE (not a routing error).
			const body = (await res.json().catch(() => ({}))) as SpotifyErrorResponse;
			const reason = body?.error?.reason ?? '';
			if (reason === 'NO_ACTIVE_DEVICE' || reason === '') return 'no_device';
			// Any other 404 reason is still treated as no_device (no actionable alternative).
			return 'no_device';
		}

		// Unexpected status — treat as no_device so the caller can surface a message.
		return 'no_device';
	} catch {
		// Network error, timeout, or parse failure — treat as no_device.
		return 'no_device';
	}
}
