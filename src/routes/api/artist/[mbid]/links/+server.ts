/**
 * MusicBrainz API proxy for artist external links.
 *
 * Fetches URL relationships from MusicBrainz, categorizes them using
 * the MB relationship type into semantic groups (streaming, social, official,
 * info, support, other). Implements rate limiting (1100ms between requests)
 * and Cloudflare Cache API caching (24hr TTL).
 *
 * Returns both the new CategorizedLinks format and legacy PlatformLinks
 * for backwards compatibility during the transition.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PlatformLinks, CategorizedLinks } from '$lib/embeds/types';
import { categorizeByRelationType, detectPlatform, labelFromUrl, emptyCategorizedLinks } from '$lib/embeds/categorize';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';
const CACHE_TTL = 86400; // 24 hours

let lastMbRequest = 0;

/** Domain-based categorization for legacy PlatformLinks format. */
function categorizeDomain(url: string): keyof PlatformLinks {
	try {
		const hostname = new URL(url).hostname;
		if (hostname.includes('bandcamp.com')) return 'bandcamp';
		if (hostname.includes('open.spotify.com') || hostname === 'spotify.com') return 'spotify';
		if (hostname.includes('soundcloud.com')) return 'soundcloud';
		if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'youtube';
		if (hostname.includes('wikipedia.org')) return 'wikipedia';
		return 'other';
	} catch {
		return 'other';
	}
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const { mbid } = params;

	if (!mbid || !UUID_PATTERN.test(mbid)) {
		throw error(400, 'Invalid MBID format');
	}

	const cacheKey = `https://mercury.internal/api/artist/${mbid}/links/v2`;

	if (platform?.caches) {
		const cache = platform.caches.default;
		const cached = await cache.match(cacheKey);
		if (cached) {
			return new Response(cached.body, {
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': `public, max-age=${CACHE_TTL}`,
					'X-Cache': 'HIT'
				}
			});
		}
	}

	// Rate limit
	const now = Date.now();
	const elapsed = now - lastMbRequest;
	if (elapsed < 1100) {
		await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
	}
	lastMbRequest = Date.now();

	let mbResponse: Response;
	try {
		mbResponse = await fetch(
			`https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
			{
				headers: {
					'User-Agent': USER_AGENT,
					Accept: 'application/json'
				}
			}
		);
	} catch {
		throw error(502, 'Failed to reach MusicBrainz API');
	}

	if (mbResponse.status === 404) {
		throw error(404, 'Artist not found on MusicBrainz');
	}

	if (!mbResponse.ok) {
		throw error(502, `MusicBrainz API returned ${mbResponse.status}`);
	}

	const data = (await mbResponse.json()) as {
		relations?: Array<{
			'target-type'?: string;
			type?: string;
			url?: { resource?: string };
		}>;
	};

	// Build both legacy and new categorized formats
	const legacy: PlatformLinks = {
		bandcamp: [],
		spotify: [],
		soundcloud: [],
		youtube: [],
		wikipedia: [],
		other: []
	};

	const categorized: CategorizedLinks = emptyCategorizedLinks();

	if (data.relations) {
		// Track URLs we've already added to avoid duplicates
		const seen = new Set<string>();

		for (const rel of data.relations) {
			if (rel['target-type'] === 'url' && rel.url?.resource) {
				const url = rel.url.resource;
				if (seen.has(url)) continue;
				seen.add(url);

				// Legacy format
				const domainCategory = categorizeDomain(url);
				legacy[domainCategory].push(url);

				// New categorized format using MB relationship type
				const category = rel.type
					? categorizeByRelationType(rel.type)
					: 'other';

				// Streaming platforms detected by domain go to streaming even if
				// MB type says something else (e.g., "official homepage" for bandcamp)
				const platform = detectPlatform(url);
				const finalCategory = platform ? 'streaming' : category;

				categorized[finalCategory].push({
					url,
					label: labelFromUrl(url)
				});
			}
		}
	}

	const responseData = { legacy, categorized };

	const response = json(responseData, {
		headers: {
			'Cache-Control': `public, max-age=${CACHE_TTL}`,
			'X-Cache': 'MISS'
		}
	});

	if (platform?.caches) {
		const cache = platform.caches.default;
		const cacheResponse = new Response(JSON.stringify(responseData), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${CACHE_TTL}`
			}
		});
		platform.context.waitUntil(cache.put(cacheKey, cacheResponse));
	}

	return response;
};
