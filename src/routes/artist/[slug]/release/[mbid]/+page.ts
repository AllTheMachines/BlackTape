/**
 * Load function for the release detail page — Tauri desktop only.
 * Fetches MusicBrainz directly. Buy links built without affiliate coding
 * (no server env in Tauri context) — links still work as search fallbacks.
 */

import type { PageLoad } from './$types';

const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';

export interface Track {
	position: number;
	number: string;
	title: string;
	/** Duration in milliseconds, or null if unknown. */
	length: number | null;
}

export interface Credit {
	name: string;
	role: string;
}

/** A release credit with role/name/mbid and optional local artist slug. */
export type CreditEntry = { role: string; name: string; mbid: string; slug: string | null };

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
	buyLinks: import('$lib/affiliates/types').BuyLink[];
}

/** Credit roles to include in the collapsible Credits section. */
const CREDIT_ROLES = new Set([
	'producer', 'engineer', 'mix', 'lyricist', 'composer',
	'performer', 'instrument', 'vocal'
]);

export const load: PageLoad = async ({ params, fetch }) => {
	const { mbid, slug } = params;
	let release: ReleaseDetail | null = null;
	/** Raw credits without slug — populated inside the fetch block. */
	let rawCredits: Omit<CreditEntry, 'slug'>[] = [];
	/** Streaming URLs extracted from MB URL relations. */
	const streamingUrls: { bandcamp: string | null; spotify: string | null; soundcloud: string | null; youtube: string | null } = {
		bandcamp: null, spotify: null, soundcloud: null, youtube: null
	};

	try {
		const mbUrl = `https://musicbrainz.org/ws/2/release?release-group=${mbid}&inc=recordings+artist-credits+media+artist-rels+url-rels&limit=1&fmt=json`;
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10_000);
		let resp: Response;
		try {
			resp = await fetch(mbUrl, {
				headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
				signal: controller.signal
			});
		} finally {
			clearTimeout(timeoutId);
		}

		if (resp.ok) {
			const mbData = await resp.json() as {
				releases?: Array<{
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
						artist?: { name: string; id: string };
						url?: { resource?: string };
					}>;
				}>;
			};

			const rels = mbData.releases ?? [];
			if (rels.length > 0) {
				const rel = rels[0];

				const tracks: Track[] = [];
				for (const medium of rel.media ?? []) {
					for (const track of medium.tracks ?? []) {
						tracks.push({
							position: track.position,
							number: track.number,
							title: track.title,
							length: track.length ?? null
						});
					}
				}

				const credits: Credit[] = [];
				for (const r of rel.relations ?? []) {
					if (r['target-type'] === 'artist' && r.artist?.name && r.type) {
						credits.push({ name: r.artist.name, role: r.type });
					}
				}

				// Collect detailed credits (with MBID) for the collapsible Credits section
				for (const r of rel.relations ?? []) {
					if (r['target-type'] === 'artist' && r.type && r.artist?.name && r.artist?.id) {
						if (CREDIT_ROLES.has(r.type)) {
							rawCredits.push({ role: r.type, name: r.artist.name, mbid: r.artist.id });
						}
					}
				}

				for (const r of rel.relations ?? []) {
					if (r['target-type'] === 'url' && r.url?.resource) {
						try {
							const hostname = new URL(r.url.resource).hostname;
							if (!streamingUrls.bandcamp && hostname.includes('bandcamp.com')) streamingUrls.bandcamp = r.url.resource;
							else if (!streamingUrls.spotify && hostname.includes('spotify.com')) streamingUrls.spotify = r.url.resource;
							else if (!streamingUrls.soundcloud && hostname.includes('soundcloud.com')) streamingUrls.soundcloud = r.url.resource;
							else if (!streamingUrls.youtube && (hostname.includes('youtube.com') || hostname.includes('youtu.be'))) streamingUrls.youtube = r.url.resource;
						} catch { /* skip */ }
					}
				}

				const artistName =
					rel['artist-credit']?.[0]?.artist?.name ??
					rel['artist-credit']?.[0]?.name ??
					'';

				const year = rel.date ? parseInt(rel.date.substring(0, 4), 10) || null : null;

				const { buildBuyLinks } = await import('$lib/affiliates/construct');
				const buyLinks = buildBuyLinks(artistName, rel.title, streamingUrls.bandcamp, {
					amazonTag: null,
					appleToken: null,
					appleCampaign: null
				});

				release = {
					releaseGroupMbid: mbid,
					title: rel.title,
					year,
					type: rel['release-group']?.['primary-type'] ?? 'Release',
					coverArtUrl: `https://coverartarchive.org/release-group/${mbid}/front-500`,
					artistName,
					artistSlug: slug,
					tracks,
					credits,
					buyLinks
				};
			}
		}
	} catch (err) {
		console.error('Release fetch error:', err);
	}

	// Resolve slugs for credits against local DB (Tauri only — graceful degradation)
	let credits: CreditEntry[] = [];
	if (rawCredits.length > 0) {
		try {
			const { getProvider } = await import('$lib/db/provider');
			const provider = await getProvider();
			credits = await Promise.all(
				rawCredits.map(async (c) => {
					try {
						const row = await provider.get<{ slug: string }>(
							'SELECT slug FROM artists WHERE mbid = ?',
							c.mbid
						);
						return { ...c, slug: row?.slug ?? null };
					} catch {
						return { ...c, slug: null };
					}
				})
			);
		} catch {
			// Provider unavailable (web/dev mode) — credits shown without links
			credits = rawCredits.map((c) => ({ ...c, slug: null }));
		}
	}

	// Build PlatformLinks arrays for EmbedPlayer (which expects string[]).
	const platformLinks = {
		bandcamp: streamingUrls.bandcamp ? [streamingUrls.bandcamp] : [],
		spotify: streamingUrls.spotify ? [streamingUrls.spotify] : [],
		soundcloud: streamingUrls.soundcloud ? [streamingUrls.soundcloud] : [],
		youtube: streamingUrls.youtube ? [streamingUrls.youtube] : [],
		wikipedia: [],
		other: []
	};
	const hasAnyStream = Object.values(streamingUrls).some(Boolean);
	return { release, slug, mbid, credits, platformLinks, hasAnyStream };
};
