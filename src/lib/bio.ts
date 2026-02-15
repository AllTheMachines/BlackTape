/**
 * Wikipedia bio snippet fetcher.
 *
 * Uses the Wikipedia REST API to fetch plain-text summaries
 * for artist pages. Best-effort — returns null on any failure.
 */

const WIKI_URL_PATTERN = /\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)/;

/**
 * Fetch a plain-text bio snippet from Wikipedia.
 *
 * @param wikiUrl - A Wikipedia article URL (any language)
 * @returns The extract (first paragraph) as plain text, or null on failure
 */
export async function fetchWikipediaBio(wikiUrl: string): Promise<string | null> {
	try {
		const match = wikiUrl.match(WIKI_URL_PATTERN);
		if (!match) return null;

		const [, lang, title] = match;

		const response = await fetch(
			`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${title}`,
			{
				headers: {
					'User-Agent': 'Mercury/0.1.0',
					Accept: 'application/json'
				}
			}
		);

		if (!response.ok) return null;

		const data = (await response.json()) as { extract?: string };
		return data.extract ?? null;
	} catch {
		// Bio is best-effort, not critical
		return null;
	}
}
