/**
 * Mercury URL detection and unfurl fetch utilities.
 *
 * Server-only note: `unfurl.js` is a server-only package and is only imported in
 * +server.ts routes. This client module does NOT import unfurl.js directly.
 */

export interface UnfurlCard {
	title: string;
	description?: string;
	image?: string;
	url: string;
}

/**
 * Matches Mercury artist, release, and Knowledge Base page URLs.
 * Uses the /g flag — create a fresh RegExp instance per call (or use matchAll).
 */
export const MERCURY_URL_PATTERN = /https?:\/\/[^\s]+\/(artist|release|kb)\/[^\s]+/g;

/**
 * Extracts all Mercury page URLs from a message string.
 */
export function extractMercuryUrls(content: string): string[] {
	const pattern = new RegExp(MERCURY_URL_PATTERN.source, 'g');
	return [...content.matchAll(pattern)].map((m) => m[0]);
}

/**
 * Fetches unfurl preview data for a Mercury URL via the /api/unfurl endpoint.
 *
 * Not debounced here — callers (e.g. MessageInput.svelte) apply their own 800ms
 * debounce and URL validation before invoking this function.
 */
export async function fetchUnfurlData(url: string): Promise<UnfurlCard | null> {
	try {
		const res = await fetch('/api/unfurl', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ url })
		});
		if (!res.ok) return null;
		return (await res.json()) as UnfurlCard;
	} catch {
		return null;
	}
}
