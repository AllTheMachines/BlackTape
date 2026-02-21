import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getAffiliateConfig } from '$lib/affiliates/config';
import { buildBuyLinks } from '$lib/affiliates/construct';
import type { BuyLink } from '$lib/affiliates/types';

const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';
const MB_CACHE_TTL = 86400; // 24 hours in seconds

/**
 * Track-level data from MusicBrainz release tracklist.
 */
export interface Track {
	position: number;
	number: string;
	title: string;
	/** Duration in milliseconds, or null if unknown. */
	length: number | null;
}

/**
 * Personnel credit from MusicBrainz artist-rels on the release.
 */
export interface Credit {
	name: string;
	role: string;
}

/**
 * Full release detail for the page.
 */
export interface ReleaseDetail {
	releaseGroupMbid: string;
	title: string;
	year: number | null;
	type: string;
	coverArtUrl: string;
	artistName: string;
	artistSlug: string;
	tracks: Track[];
	credits: Credit[];
	buyLinks: BuyLink[];
}

export const load: PageServerLoad = async ({ params, platform, fetch }) => {
	const { slug, mbid } = params;

	// On Cloudflare Pages, platform.env.DB is available.
	// On Tauri dev, platform is undefined — universal +page.ts handles it.
	if (!platform?.env?.DB) {
		// Return minimal shell; +page.ts (universal) will hydrate from local DB + MB API
		return {
			release: null as ReleaseDetail | null,
			slug,
			mbid,
		};
	}

	// Fetch release data from MusicBrainz.
	// Use browse endpoint with release-group MBID to get the main release + tracklist.
	// inc= params: recordings (tracklist), media (disc structure), artist-rels (credits)
	const mbUrl = `https://musicbrainz.org/ws/2/release?release-group=${mbid}&inc=recordings+artist-credits+media+artist-rels&limit=1&fmt=json`;

	let mbData: MbReleaseResponse | null = null;

	// Check Cloudflare Cache first (24hr TTL — same pattern as artist API routes)
	const cacheKey = new Request(mbUrl);
	const cache = platform.caches ? platform.caches.default : null;

	if (cache) {
		const cached = await cache.match(cacheKey);
		if (cached) {
			mbData = await cached.json() as MbReleaseResponse;
		}
	}

	if (!mbData) {
		const resp = await fetch(mbUrl, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
		});
		if (!resp.ok) {
			// MB API failure — return minimal data, page renders with what we have
			console.error(`MusicBrainz release fetch failed: ${resp.status}`);
			return buildMinimalRelease(slug, mbid);
		}
		mbData = await resp.json() as MbReleaseResponse;

		// Cache the response
		if (cache) {
			const cacheResponse = new Response(JSON.stringify(mbData), {
				headers: { 'Cache-Control': `max-age=${MB_CACHE_TTL}` },
			});
			cache.put(cacheKey, cacheResponse);
		}
	}

	const releases = mbData.releases ?? [];
	if (releases.length === 0) {
		throw error(404, 'Release not found');
	}

	const rel = releases[0];

	// Extract tracklist from media[].tracks[]
	const tracks: Track[] = [];
	for (const medium of rel.media ?? []) {
		for (const track of medium.tracks ?? []) {
			tracks.push({
				position: track.position,
				number: track.number,
				title: track.title,
				length: track.length ?? null,
			});
		}
	}

	// Extract personnel credits from artist-rels on the release
	const credits: Credit[] = [];
	for (const rel_entry of rel.relations ?? []) {
		if (rel_entry['target-type'] === 'artist' && rel_entry.artist?.name && rel_entry.type) {
			credits.push({ name: rel_entry.artist.name, role: rel_entry.type });
		}
	}

	// Extract Bandcamp URL from release URL-rels (release-level, not artist-level)
	// IMPORTANT: Only use Bandcamp URLs from the RELEASE, not artist-level Bandcamp links.
	// Artist-level Bandcamp URLs go to the artist homepage; we need album-specific URLs.
	let bandcampUrl: string | null = null;
	for (const rel_entry of rel.relations ?? []) {
		if (rel_entry['target-type'] === 'url' && rel_entry.url?.resource) {
			try {
				const host = new URL(rel_entry.url.resource).hostname;
				if (host.includes('bandcamp.com')) {
					bandcampUrl = rel_entry.url.resource;
					break;
				}
			} catch { /* invalid URL — skip */ }
		}
	}

	// Extract artist name from artist-credit
	const artistCredit = rel['artist-credit']?.[0];
	const artistName = artistCredit?.artist?.name ?? artistCredit?.name ?? '';

	// Parse year from first release date
	const year = rel.date ? parseInt(rel.date.substring(0, 4), 10) || null : null;

	// Build affiliate buy links server-side (env vars available here)
	const affiliateConfig = getAffiliateConfig();
	const buyLinks = buildBuyLinks(artistName, rel.title, bandcampUrl, affiliateConfig);

	const release: ReleaseDetail = {
		releaseGroupMbid: mbid,
		title: rel.title,
		year,
		type: rel['release-group']?.['primary-type'] ?? 'Release',
		coverArtUrl: `https://coverartarchive.org/release-group/${mbid}/front-500`,
		artistName,
		artistSlug: slug,
		tracks,
		credits,
		buyLinks,
	};

	return { release, slug, mbid };
};

function buildMinimalRelease(slug: string, mbid: string) {
	return {
		release: null as ReleaseDetail | null,
		slug,
		mbid,
	};
}

// MusicBrainz API response types (inline — not worth a separate file for now)
interface MbReleaseResponse {
	releases?: MbRelease[];
}

interface MbRelease {
	id: string;
	title: string;
	date?: string;
	'release-group'?: { 'primary-type'?: string };
	'artist-credit'?: Array<{ name?: string; artist?: { name: string } }>;
	media?: Array<{
		tracks?: Array<{
			position: number;
			number: string;
			title: string;
			length?: number;
		}>;
	}>;
	relations?: Array<{
		'target-type'?: string;
		type?: string;
		artist?: { name: string };
		url?: { resource?: string };
	}>;
}
