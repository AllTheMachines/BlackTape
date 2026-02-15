/**
 * Spotify URL to embed URL transformer.
 *
 * Parses Spotify URLs and returns embed-ready iframe URLs
 * with dark theme (theme=0).
 */

const SPOTIFY_PATTERN = /open\.spotify\.com\/(artist|album|track|playlist)\/([a-zA-Z0-9]+)/;

/**
 * Convert a Spotify URL to an embeddable iframe URL.
 *
 * @param url - A Spotify URL (e.g. https://open.spotify.com/artist/4Z8W...)
 * @returns Embed URL with dark theme, or null if URL doesn't match
 */
export function spotifyEmbedUrl(url: string): string | null {
	const match = url.match(SPOTIFY_PATTERN);
	if (!match) return null;

	const [, type, id] = match;
	return `https://open.spotify.com/embed/${type}/${id}?theme=0`;
}
