/**
 * Wikipedia artist thumbnail fetcher.
 *
 * Uses the Wikipedia REST API page/summary endpoint (same as bio.ts)
 * to pull the thumbnail for a given artist name. Best-effort — returns
 * null on any failure, including artists with no Wikipedia article.
 *
 * Results are cached in-memory for the session (one fetch per artist name).
 */

const cache = new Map<string, string | null>();

/**
 * Fetch a Wikipedia thumbnail URL for an artist by name.
 *
 * @param artistName - The artist's display name
 * @returns The thumbnail URL (ready to use as img src), or null on any failure
 */
export async function getWikiThumbnail(artistName: string): Promise<string | null> {
	if (cache.has(artistName)) return cache.get(artistName) ?? null;

	try {
		// Wikipedia article titles use underscores; most artists match their article title exactly
		const title = encodeURIComponent(artistName.replace(/ /g, '_'));
		const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
			headers: {
				'User-Agent': 'BlackTape/0.1.0',
				Accept: 'application/json'
			}
		});
		if (!res.ok) {
			cache.set(artistName, null);
			return null;
		}
		const data = await res.json();
		const url: string | null = data?.thumbnail?.source ?? null;
		cache.set(artistName, url);
		return url;
	} catch {
		cache.set(artistName, null);
		return null;
	}
}
