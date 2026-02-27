/**
 * Bandcamp URL handling.
 *
 * Bandcamp has NO oEmbed. The url= parameter approach (bandcampEmbedUrl)
 * is used for embed generation — spike confirmed PASSES in Tauri WebView2.
 * External link functions retained for fallback (timeout) and non-embed contexts.
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
 * SPIKE RESULT (2026-02-27): PASSES in Tauri WebView2 on Windows.
 * Confirmed: url= parameter renders Bandcamp compact player in WebView2.
 * Method: Launched mercury.exe debug binary with CDP, injected iframe with url= param,
 * observed onload event firing within 12 seconds (tools/bandcamp-spike.mjs).
 * Implementation: EmbedPlayer renders iframe using this URL for BC-01 and BC-02.
 * Format confirmed by Bluesky social app PR #9445 (2024).
 */
export function bandcampEmbedUrl(url: string): string {
	return `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(url)}/size=large/transparent=true/`;
}
