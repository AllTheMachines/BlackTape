/**
 * MusicBrainz API proxy for artist release groups (discography).
 *
 * Fetches release groups with URL relationships from MusicBrainz,
 * extracts streaming links per release, and constructs Cover Art Archive URLs.
 * Implements rate limiting (1100ms) and Cloudflare Cache API caching (24hr TTL).
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ReleaseGroup, ReleaseLink } from '$lib/embeds/types';
import { detectPlatform } from '$lib/embeds/categorize';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';
const CACHE_TTL = 86400; // 24 hours

let lastMbRequest = 0;

/** Normalize MB primary-type to our display type. */
function normalizeType(primaryType: string | undefined): ReleaseGroup['type'] {
	switch (primaryType) {
		case 'Album':
			return 'Album';
		case 'EP':
			return 'EP';
		case 'Single':
			return 'Single';
		default:
			return 'Other';
	}
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const { mbid } = params;

	if (!mbid || !UUID_PATTERN.test(mbid)) {
		throw error(400, 'Invalid MBID format');
	}

	// Check Cloudflare Cache API
	const cacheKey = `https://mercury.internal/api/artist/${mbid}/releases`;

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

	// Fetch release groups with URL relationships
	let mbResponse: Response;
	try {
		mbResponse = await fetch(
			`https://musicbrainz.org/ws/2/release-group?artist=${mbid}&inc=url-rels&type=album|single|ep&fmt=json&limit=50`,
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

	if (!mbResponse.ok) {
		throw error(502, `MusicBrainz API returned ${mbResponse.status}`);
	}

	const data = (await mbResponse.json()) as {
		'release-groups'?: Array<{
			id: string;
			title: string;
			'first-release-date'?: string;
			'primary-type'?: string;
			relations?: Array<{
				'target-type'?: string;
				type?: string;
				url?: { resource?: string };
			}>;
		}>;
	};

	const releases: ReleaseGroup[] = (data['release-groups'] ?? []).map((rg) => {
		// Extract year from first-release-date (format: YYYY or YYYY-MM-DD)
		const dateStr = rg['first-release-date'];
		const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) || null : null;

		// Extract streaming links from URL relationships
		const links: ReleaseLink[] = [];
		if (rg.relations) {
			for (const rel of rg.relations) {
				if (rel['target-type'] === 'url' && rel.url?.resource) {
					const platform = detectPlatform(rel.url.resource);
					if (platform) {
						links.push({ url: rel.url.resource, platform });
					}
				}
			}
		}

		return {
			mbid: rg.id,
			title: rg.title,
			year,
			type: normalizeType(rg['primary-type']),
			coverArtUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
			links
		};
	});

	// Sort by year descending (newest first), nulls last
	releases.sort((a, b) => {
		if (a.year === null && b.year === null) return 0;
		if (a.year === null) return 1;
		if (b.year === null) return -1;
		return b.year - a.year;
	});

	const response = json(releases, {
		headers: {
			'Cache-Control': `public, max-age=${CACHE_TTL}`,
			'X-Cache': 'MISS'
		}
	});

	// Store in Cloudflare cache
	if (platform?.caches) {
		const cache = platform.caches.default;
		const cacheResponse = new Response(JSON.stringify(releases), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': `public, max-age=${CACHE_TTL}`
			}
		});
		platform.context.waitUntil(cache.put(cacheKey, cacheResponse));
	}

	return response;
};
