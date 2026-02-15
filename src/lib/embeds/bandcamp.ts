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
