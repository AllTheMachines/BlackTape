/**
 * Spotify PKCE OAuth flow, token persistence, and proactive refresh.
 *
 * Uses @fabianlars/tauri-plugin-oauth to spin up a temporary local server.
 * CRITICAL: redirectUri MUST use http://127.0.0.1 — localhost is blocked by
 * Spotify since November 2025 (confirmed, GitHub issue open).
 *
 * All tokens stored in taste.db ai_settings using existing set_ai_setting /
 * get_all_ai_settings Tauri invoke commands (same pattern as preferences.svelte.ts).
 *
 * Keys used:
 * - spotify_client_id
 * - spotify_access_token
 * - spotify_refresh_token
 * - spotify_token_expiry   (Unix ms timestamp as string)
 * - spotify_display_name
 *
 * Dynamic imports for all Tauri plugins — avoids web build breakage.
 */

import { spotifyState, setSpotifyConnected, type SpotifyStoredState } from './state.svelte';

// ─── PKCE helpers (copied verbatim from src/lib/taste/import/spotify.ts) ──────

function generateRandomString(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const values = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
	const verifier = generateRandomString(128);
	const data = new TextEncoder().encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
	return { verifier, challenge };
}

// ─── Tauri invoke helper ───────────────────────────────────────────────────────

async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke> {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

// ─── OAuth flow ───────────────────────────────────────────────────────────────

const SCOPES = 'user-read-private user-read-playback-state user-modify-playback-state';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const AUTH_TIMEOUT_MS = 120_000;

// Fixed port for the local OAuth callback server.
// Spotify dashboard requires an exact URI — dynamic ports can't be pre-registered.
// If 7743 is in use, auth will fail with a port-binding error.
export const OAUTH_PORT = 7743;
export const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/callback`;

/**
 * Start the Spotify PKCE OAuth flow.
 *
 * Opens the system browser to the Spotify auth page, waits for the callback
 * redirect via tauri-plugin-oauth local server (127.0.0.1, NOT localhost),
 * exchanges the code for tokens, and fetches the user's display name.
 *
 * Throws Error('Authorization timed out') if the user does not complete
 * auth within 120 seconds.
 */
export async function startSpotifyAuth(clientId: string): Promise<SpotifyStoredState> {
	const { start, onUrl, cancel } = await import('@fabianlars/tauri-plugin-oauth');
	const { verifier, challenge } = await generatePKCE();
	const csrfState = generateRandomString(16);

	const port = await start({ ports: [OAUTH_PORT] });
	const redirectUri = OAUTH_REDIRECT_URI;

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		scope: SCOPES,
		redirect_uri: redirectUri,
		code_challenge_method: 'S256',
		code_challenge: challenge,
		state: csrfState
	});

	const authUrl = `${AUTHORIZE_URL}?${params}`;

	const { open } = await import('@tauri-apps/plugin-shell');
	await open(authUrl);

	// Wait for callback with 120s timeout.
	const redirectUrl = await new Promise<string>((resolve, reject) => {
		const timer = setTimeout(async () => {
			await cancel(port).catch(() => undefined);
			reject(new Error('Authorization timed out'));
		}, AUTH_TIMEOUT_MS);

		onUrl((url: string) => {
			clearTimeout(timer);
			resolve(url);
		});
	});

	const callbackParams = new URL(redirectUrl).searchParams;
	const code = callbackParams.get('code');
	if (!code) throw new Error('Spotify auth failed: no code in redirect URL');

	// Exchange authorization code for tokens.
	const tokenRes = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			code_verifier: verifier
		})
	});

	if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);

	interface TokenResponse {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	}
	const tokens = (await tokenRes.json()) as TokenResponse;

	// Fetch display name from Spotify profile.
	const profileRes = await fetch('https://api.spotify.com/v1/me', {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});

	interface ProfileResponse {
		display_name: string;
	}
	const profile = profileRes.ok ? ((await profileRes.json()) as ProfileResponse) : null;

	return {
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		tokenExpiry: Date.now() + tokens.expires_in * 1000,
		clientId,
		displayName: profile?.display_name ?? ''
	};
}

// ─── Token persistence ────────────────────────────────────────────────────────

/**
 * Persist Spotify tokens to taste.db ai_settings.
 * All 5 keys are always written together for consistency.
 */
export async function saveSpotifyTokens(data: SpotifyStoredState): Promise<void> {
	const invoke = await getInvoke();
	await invoke('set_ai_setting', { key: 'spotify_client_id', value: data.clientId });
	await invoke('set_ai_setting', { key: 'spotify_access_token', value: data.accessToken });
	await invoke('set_ai_setting', { key: 'spotify_refresh_token', value: data.refreshToken });
	await invoke('set_ai_setting', {
		key: 'spotify_token_expiry',
		value: String(data.tokenExpiry)
	});
	await invoke('set_ai_setting', { key: 'spotify_display_name', value: data.displayName });
}

/**
 * Load Spotify tokens from taste.db ai_settings.
 * Returns null if spotify_access_token is empty or missing.
 */
export async function loadSpotifyState(): Promise<SpotifyStoredState | null> {
	const invoke = await getInvoke();
	const settings = await invoke<Record<string, string>>('get_all_ai_settings');
	const accessToken = settings['spotify_access_token'] ?? '';
	if (!accessToken) return null;
	return {
		accessToken,
		refreshToken: settings['spotify_refresh_token'] ?? '',
		tokenExpiry: Number(settings['spotify_token_expiry'] ?? '0'),
		clientId: settings['spotify_client_id'] ?? '',
		displayName: settings['spotify_display_name'] ?? ''
	};
}

/**
 * Wipe all Spotify tokens from taste.db.
 * Sets all 5 keys to empty string — does not delete rows.
 */
export async function clearSpotifyTokens(): Promise<void> {
	const invoke = await getInvoke();
	const keys = [
		'spotify_client_id',
		'spotify_access_token',
		'spotify_refresh_token',
		'spotify_token_expiry',
		'spotify_display_name'
	];
	for (const key of keys) {
		await invoke('set_ai_setting', { key, value: '' });
	}
}

// ─── Token refresh ────────────────────────────────────────────────────────────

interface RefreshResult {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

/**
 * Refresh Spotify tokens using the stored refresh token.
 * If the response does not include a new refresh_token, the existing one is kept.
 */
async function refreshSpotifyToken(
	clientId: string,
	refreshToken: string
): Promise<RefreshResult> {
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId
		})
	});

	if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

	interface RefreshResponse {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
	}
	const data = (await res.json()) as RefreshResponse;

	return {
		accessToken: data.access_token,
		// Keep existing refresh token if not rotated in response.
		refreshToken: data.refresh_token ?? refreshToken,
		expiresIn: data.expires_in
	};
}

/**
 * Return a valid access token, refreshing proactively if within 60s of expiry.
 *
 * Throws if refresh fails — callers should surface:
 * "Spotify session expired — reconnect in Settings."
 */
export async function getValidAccessToken(): Promise<string> {
	const REFRESH_BUFFER_MS = 60_000;

	if (Date.now() > spotifyState.tokenExpiry - REFRESH_BUFFER_MS) {
		const refreshed = await refreshSpotifyToken(
			spotifyState.clientId,
			spotifyState.refreshToken
		);

		const newExpiry = Date.now() + refreshed.expiresIn * 1000;
		const updated: SpotifyStoredState = {
			accessToken: refreshed.accessToken,
			refreshToken: refreshed.refreshToken,
			tokenExpiry: newExpiry,
			clientId: spotifyState.clientId,
			displayName: spotifyState.displayName
		};

		// Update reactive state.
		setSpotifyConnected(updated);

		// Persist refreshed tokens.
		await saveSpotifyTokens(updated);
	}

	return spotifyState.accessToken;
}
