/**
 * Artist matching — normalize local file artist names and match them
 * against the Mercury discovery index via FTS5.
 *
 * All matching is best-effort: failures never block playback.
 */

import type { ArtistResult } from '$lib/db/queries';

/**
 * Normalize an artist name for matching against the discovery index.
 *
 * - Splits on feat./ft./featuring/& and takes the primary artist
 * - Strips leading "The " (case insensitive)
 * - Strips trailing parenthetical qualifiers like (Remastered) or [Deluxe]
 */
export function normalizeArtistName(name: string): string {
	let normalized = name.trim();

	// Split on feat./ft./featuring/& — take the first (primary) artist
	normalized = normalized.split(/\s+(?:feat\.?|ft\.?|featuring|&)\s+/i)[0];

	// Strip leading "The " (case insensitive)
	normalized = normalized.replace(/^the\s+/i, '');

	// Strip trailing parenthetical qualifiers: (Remastered), [Deluxe Edition], etc.
	normalized = normalized.replace(/\s*[\(\[][^\)\]]*[\)\]]\s*$/, '');

	return normalized.trim();
}

/**
 * Match an artist name from local file metadata to the Mercury discovery index.
 *
 * Uses FTS5 search, then picks the best match:
 * - Exact match (case insensitive) on name is returned immediately
 * - Otherwise returns the first FTS5 result (trusting its ranking)
 * - Returns null if no results
 */
export async function matchArtistToIndex(artistName: string): Promise<ArtistResult | null> {
	try {
		const normalized = normalizeArtistName(artistName);
		if (!normalized) return null;

		const { getProvider } = await import('$lib/db/provider');
		const { searchArtists } = await import('$lib/db/queries');

		const db = await getProvider();
		const results = await searchArtists(db, normalized, 5);

		if (results.length === 0) return null;

		// Exact match (case insensitive) gets priority
		const exact = results.find(
			(r) => r.name.toLowerCase() === normalized.toLowerCase()
		);
		if (exact) return exact;

		// Otherwise trust FTS5 ranking — return first result
		return results[0];
	} catch (err) {
		// Matching is best-effort — never block playback
		console.warn('Artist matching failed:', err);
		return null;
	}
}

/**
 * Find related artists by shared tags.
 *
 * Takes the first (most prominent) tag from the matched artist,
 * searches for other artists with the same tag, and returns up to 5.
 */
export async function getRelatedArtists(matchedArtist: ArtistResult): Promise<ArtistResult[]> {
	try {
		if (!matchedArtist.tags) return [];

		// Tags are comma-separated — take the first (most prominent)
		const firstTag = matchedArtist.tags.split(',')[0].trim();
		if (!firstTag) return [];

		const { getProvider } = await import('$lib/db/provider');
		const { searchByTag } = await import('$lib/db/queries');

		const db = await getProvider();
		const results = await searchByTag(db, firstTag, 10);

		// Filter out the matched artist itself, return top 5
		return results
			.filter((r) => r.id !== matchedArtist.id)
			.slice(0, 5);
	} catch (err) {
		console.warn('Related artists lookup failed:', err);
		return [];
	}
}
