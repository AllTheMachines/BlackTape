/**
 * Bandcamp URL handling — external link only.
 *
 * Bandcamp has NO oEmbed and requires album IDs not available from
 * MusicBrainz URLs. Per locked decision: always show "Listen on Bandcamp"
 * as an external link fallback. No embed generation.
 */

const BANDCAMP_PATTERN = /bandcamp\.com/;

/**
 * Return the original Bandcamp URL for use as an external link.
 *
 * @param url - A Bandcamp URL
 * @returns The same URL (Bandcamp is external-link-only)
 */
export function bandcampExternalUrl(url: string): string {
	return url;
}

/**
 * Detect whether a URL is a Bandcamp URL.
 */
export function isBandcampUrl(url: string): boolean {
	return BANDCAMP_PATTERN.test(url);
}

/**
 * Construct a Bandcamp EmbeddedPlayer URL using the url= parameter.
 *
 * Spike status: [PENDING — see Task 2 in plan 32-01]
 * If the spike succeeds in Tauri WebView2, this function is used for BC embeds.
 * If the spike fails, this function exists but BC renders as ExternalLink only.
 *
 * Format confirmed by Bluesky social app PR #9445 (2024).
 */
export function bandcampEmbedUrl(url: string): string {
	return `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(url)}/size=large/transparent=true/`;
}
