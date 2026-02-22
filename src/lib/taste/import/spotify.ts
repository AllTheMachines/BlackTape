/**
 * Spotify import — PKCE OAuth via tauri-plugin-oauth.
 *
 * Spotify does NOT accept custom URI scheme redirects — localhost server is required.
 * Uses @fabianlars/tauri-plugin-oauth to spin up a temporary localhost server.
 *
 * User must provide their own Spotify Client ID (registered at developer.spotify.com).
 * This is a known UX friction for open-source apps — document clearly in UI.
 *
 * Returns top 50 artists from medium-term listening history.
 */

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

export interface SpotifyArtist {
	name: string;
	spotifyId: string;
	popularity: number;
}

/**
 * Start Spotify PKCE OAuth flow and return top artists.
 * @param clientId — user's Spotify Developer app Client ID
 */
export async function importFromSpotify(clientId: string): Promise<SpotifyArtist[]> {
	const { start, onUrl } = await import('@fabianlars/tauri-plugin-oauth');
	const { verifier, challenge } = await generatePKCE();

	const port = await start();
	const redirectUri = `http://localhost:${port}/callback`;

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		scope: 'user-top-read',
		redirect_uri: redirectUri,
		code_challenge_method: 'S256',
		code_challenge: challenge
	});

	const authUrl = `https://accounts.spotify.com/authorize?${params}`;

	const { open } = await import('@tauri-apps/plugin-shell');
	await open(authUrl);

	const redirectUrl = await new Promise<string>((resolve) => {
		onUrl((url: string) => resolve(url));
	});

	const code = new URL(redirectUrl).searchParams.get('code');
	if (!code) throw new Error('Spotify auth failed: no code in redirect URL');

	const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
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
	const tokens = (await tokenRes.json()) as { access_token: string };

	const artistsRes = await fetch(
		'https://api.spotify.com/v1/me/top/artists?limit=50&time_range=medium_term',
		{ headers: { Authorization: `Bearer ${tokens.access_token}` } }
	);

	if (!artistsRes.ok) throw new Error(`Failed to fetch top artists: ${artistsRes.status}`);
	const data = (await artistsRes.json()) as {
		items: Array<{ name: string; id: string; popularity: number }>;
	};

	return data.items.map((a) => ({ name: a.name, spotifyId: a.id, popularity: a.popularity }));
}
