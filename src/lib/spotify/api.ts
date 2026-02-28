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
 * Trigger playback of a Spotify album on the user's Spotify Desktop.
 *
 * Uses context_uri so Spotify queues the full album in order.
 * Fetches available devices first — passing device_id activates Spotify
 * Desktop even if it's idle (open but not currently playing).
 * Returns a discriminated PlayResult — never throws.
 */
export async function playAlbumOnSpotify(albumId: string, accessToken: string): Promise<PlayResult> {
	try {
		const deviceId = await getFirstAvailableDeviceId(accessToken);
		const url = deviceId
			? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
			: 'https://api.spotify.com/v1/me/player/play';

		const res = await fetch(url, {
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

/** A single track from the top-tracks endpoint, with display info. */
export interface SpotifyTopTrack {
	uri: string;
	name: string;
	durationMs: number;
}

interface SpotifyRawTrack {
	uri: string;
	name: string;
	duration_ms: number;
	artists: { name: string }[];
}

interface TopTracksResponse {
	tracks: SpotifyRawTrack[];
}

/** An item in the Spotify playback queue. */
export interface SpotifyQueueItem {
	uri: string;
	name: string;
	artists: string;
	durationMs: number;
}

interface SpotifyErrorResponse {
	error?: {
		status: number;
		reason?: string;
	};
}

interface SpotifyDevice {
	id: string;
	is_active: boolean;
	is_restricted: boolean;
	type: string; // 'Computer', 'Smartphone', etc.
}

interface DevicesResponse {
	devices: SpotifyDevice[];
}

// ─── Device helpers ───────────────────────────────────────────────────────────

/**
 * Fetch available Spotify devices and return the best one to target.
 *
 * Preference order: active non-restricted → any non-restricted → null.
 * Passing a device_id to the play endpoint activates an idle Spotify Desktop,
 * which fixes "open but not playing" returning NO_ACTIVE_DEVICE.
 *
 * Returns null on any error — callers fall back to deviceless play.
 */
export async function getFirstAvailableDeviceId(accessToken: string): Promise<string | null> {
	try {
		const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		if (!res.ok) return null;
		const data = (await res.json()) as DevicesResponse;
		const devices = data.devices ?? [];
		const active = devices.find((d) => d.is_active && !d.is_restricted);
		if (active) return active.id;
		const any = devices.find((d) => !d.is_restricted);
		return any?.id ?? null;
	} catch {
		return null;
	}
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Get the top tracks for a Spotify artist (up to 10), with name and duration.
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
): Promise<SpotifyTopTrack[]> {
	const url = `https://api.spotify.com/v1/artists/${spotifyArtistId}/top-tracks?market=from_token`;

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});

	if (res.status === 401) throw new SpotifyAuthError();
	if (res.status === 404) throw new SpotifyNotFoundError();
	if (!res.ok) throw new Error(`Spotify top-tracks request failed: ${res.status}`);

	const data = (await res.json()) as TopTracksResponse;
	return data.tracks.map((t) => ({
		uri: t.uri,
		name: t.name,
		durationMs: t.duration_ms
	}));
}

// ─── Current playback state ───────────────────────────────────────────────────

export interface CurrentPlaybackState {
	isPlaying: boolean;
	uri: string;
	title: string;
	artist: string;
	album: string;
	durationMs: number;
	progressMs: number;
	shuffleState: boolean;
	repeatState: 'off' | 'track' | 'context';
	volumePercent: number;
}

/**
 * Fetch the user's current Spotify playback state.
 *
 * Returns null if nothing is playing (HTTP 204) or on any error.
 * Used by the polling loop in streaming.svelte.ts to keep the player bar live.
 */
export async function getCurrentPlayback(
	accessToken: string
): Promise<CurrentPlaybackState | null> {
	try {
		const res = await fetch('https://api.spotify.com/v1/me/player', {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		if (res.status === 204 || !res.ok) return null;

		interface PlaybackResponse {
			is_playing: boolean;
			progress_ms: number;
			shuffle_state: boolean;
			repeat_state: 'off' | 'track' | 'context';
			device: { volume_percent: number } | null;
			item: {
				uri: string;
				name: string;
				duration_ms: number;
				artists: { name: string }[];
				album: { name: string };
			} | null;
		}

		const data = (await res.json()) as PlaybackResponse;
		if (!data.item) return null;

		return {
			isPlaying: data.is_playing,
			uri: data.item.uri,
			title: data.item.name,
			artist: data.item.artists.map((a) => a.name).join(', '),
			album: data.item.album.name,
			durationMs: data.item.duration_ms,
			progressMs: data.progress_ms ?? 0,
			shuffleState: data.shuffle_state ?? false,
			repeatState: data.repeat_state ?? 'off',
			volumePercent: data.device?.volume_percent ?? 100
		};
	} catch {
		return null;
	}
}

// ─── Playback controls ────────────────────────────────────────────────────────

/** Pause Spotify playback. Fire-and-forget — never throws. */
export async function spotifyPause(accessToken: string): Promise<void> {
	await fetch('https://api.spotify.com/v1/me/player/pause', {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/** Resume Spotify playback. Fire-and-forget — never throws. */
export async function spotifyResume(accessToken: string): Promise<void> {
	await fetch('https://api.spotify.com/v1/me/player/play', {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/** Skip to next track. Fire-and-forget — never throws. */
export async function spotifyNext(accessToken: string): Promise<void> {
	await fetch('https://api.spotify.com/v1/me/player/next', {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/** Skip to previous track. Fire-and-forget — never throws. */
export async function spotifyPrevious(accessToken: string): Promise<void> {
	await fetch('https://api.spotify.com/v1/me/player/previous', {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/** Seek to a position in the current track. Fire-and-forget — never throws. */
export async function spotifySeek(positionMs: number, accessToken: string): Promise<void> {
	await fetch(
		`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.round(positionMs)}`,
		{
			method: 'PUT',
			headers: { Authorization: `Bearer ${accessToken}` }
		}
	).catch(() => undefined);
}

/** Set Spotify volume (0–100). Fire-and-forget — never throws. */
export async function spotifySetVolume(volumePercent: number, accessToken: string): Promise<void> {
	const v = Math.max(0, Math.min(100, Math.round(volumePercent)));
	await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${v}`, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/** Set Spotify shuffle on or off. Fire-and-forget — never throws. */
export async function spotifySetShuffle(state: boolean, accessToken: string): Promise<void> {
	await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/** Set Spotify repeat mode. Fire-and-forget — never throws. */
export async function spotifySetRepeat(
	state: 'off' | 'track' | 'context',
	accessToken: string
): Promise<void> {
	await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` }
	}).catch(() => undefined);
}

/**
 * Fetch the user's Spotify playback queue (upcoming tracks).
 * Returns an empty array on any error.
 */
export async function getSpotifyQueue(accessToken: string): Promise<SpotifyQueueItem[]> {
	try {
		const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
		if (!res.ok) return [];

		interface QueueResponse {
			queue: { uri: string; name: string; artists: { name: string }[]; duration_ms: number }[];
		}

		const data = (await res.json()) as QueueResponse;
		return (data.queue ?? []).map((t) => ({
			uri: t.uri,
			name: t.name,
			artists: t.artists.map((a) => a.name).join(', '),
			durationMs: t.duration_ms
		}));
	} catch {
		return [];
	}
}

/** Add a track URI to the Spotify playback queue. Fire-and-forget — never throws. */
export async function addToSpotifyQueue(uri: string, accessToken: string): Promise<void> {
	await fetch(
		`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
		{
			method: 'POST',
			headers: { Authorization: `Bearer ${accessToken}` }
		}
	).catch(() => undefined);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger playback of track URIs on the user's Spotify Desktop.
 *
 * Sends at most 10 URIs (Spotify Connect limit).
 * Fetches available devices first — passing device_id activates Spotify
 * Desktop even if it's idle (open but not currently playing).
 * Returns a discriminated PlayResult — never throws.
 */
export async function playTracksOnSpotify(
	trackUris: string[],
	accessToken: string
): Promise<PlayResult> {
	try {
		const deviceId = await getFirstAvailableDeviceId(accessToken);
		const url = deviceId
			? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
			: 'https://api.spotify.com/v1/me/player/play';

		const res = await fetch(url, {
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
		if (res.status === 404) return 'no_device';

		return 'no_device';
	} catch {
		return 'no_device';
	}
}
