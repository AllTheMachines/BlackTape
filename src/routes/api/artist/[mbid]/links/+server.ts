/**
 * MusicBrainz API proxy for artist external links.
 *
 * Fetches URL relationships from MusicBrainz, categorizes them by platform,
 * and returns a PlatformLinks object. Implements rate limiting (1100ms between
 * requests) and Cloudflare Cache API caching (24hr TTL).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PlatformLinks } from '$lib/embeds/types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';
const CACHE_TTL = 86400; // 24 hours

/** Track last MusicBrainz request timestamp for rate limiting. */
let lastMbRequest = 0;

/**
 * Categorize a URL by its domain into a platform bucket.
 */
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

	// Validate MBID format
	if (!mbid || !UUID_PATTERN.test(mbid)) {
		throw error(400, 'Invalid MBID format');
	}

	// Check Cloudflare Cache API first
	const cacheKey = `https://mercury.internal/api/artist/${mbid}/links`;

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

	// Rate limit: wait if less than 1100ms since last request
	const now = Date.now();
	const elapsed = now - lastMbRequest;
	if (elapsed < 1100) {
		await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
	}
	lastMbRequest = Date.now();

	// Fetch from MusicBrainz
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

	// Extract and categorize platform links
	const links: PlatformLinks = {
		bandcamp: [],
		spotify: [],
		soundcloud: [],
		youtube: [],
		wikipedia: [],
		other: []
	};

	if (data.relations) {
		for (const rel of data.relations) {
			if (rel['target-type'] === 'url' && rel.url?.resource) {
				const url = rel.url.resource;
				const category = categorizeDomain(url);
				links[category].push(url);
			}
		}
	}

	const response = json(links, {
		headers: {
			'Cache-Control': `public, max-age=${CACHE_TTL}`,
			'X-Cache': 'MISS'
		}
	});

	// Store in Cloudflare cache
	if (platform?.caches) {
		const cache = platform.caches.default;
		const cacheResponse = new Response(JSON.stringify(links), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${CACHE_TTL}`
			}
		});
		platform.context.waitUntil(cache.put(cacheKey, cacheResponse));
	}

	return response;
};
