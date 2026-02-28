/**
 * Load function for the release detail page — fetches MusicBrainz data
 * before the component renders, avoiding Svelte 5 async $state reactivity
 * issues on SvelteKit SPA navigation.
 */

import type { PageLoad } from './$types';
import { buildBuyLinks } from '$lib/affiliates/construct';

export interface Track {
	/** Unique index across all mediums (0-based). */
	id: number;
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

const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';
const CREDIT_ROLES = new Set([
	'producer', 'engineer', 'mix', 'lyricist', 'composer',
	'performer', 'instrument', 'vocal'
]);

export const load: PageLoad = async ({ params, fetch }) => {
	const { mbid, slug } = params;
	const mbUrl = `https://musicbrainz.org/ws/2/release?release-group=${mbid}&inc=recordings+artist-credits+media+artist-rels+url-rels&limit=1&fmt=json`;

	let release: ReleaseDetail | null = null;
	let platformLinks = {
		bandcamp: [] as string[],
		spotify: [] as string[],
		soundcloud: [] as string[],
		youtube: [] as string[],
		wikipedia: [] as string[],
		other: [] as string[]
	};
	let hasAnyStream = false;
	let rawCredits: Array<{ role: string; name: string; mbid: string }> = [];

	const controller = new AbortController();
	const t = setTimeout(() => controller.abort(), 8_000);
	try {
		let resp = await fetch(mbUrl, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
			signal: controller.signal
		});

		// MB rate-limit: cancel original timeout, wait, retry with fresh timeout
		if (resp.status === 429 || resp.status === 503) {
			clearTimeout(t);
			await new Promise(r => setTimeout(r, 1200));
			const c2 = new AbortController();
			const t2 = setTimeout(() => c2.abort(), 8_000);
			try {
				resp = await fetch(mbUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: c2.signal });
			} finally { clearTimeout(t2); }
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
				const streamingUrls: {
					bandcamp: string | null; spotify: string | null;
					soundcloud: string | null; youtube: string | null;
				} = { bandcamp: null, spotify: null, soundcloud: null, youtube: null };

				const tracks: Track[] = [];
				let trackId = 0;
				for (const medium of rel.media ?? []) {
					for (const track of medium.tracks ?? []) {
						tracks.push({
							id: trackId++,
							position: track.position,
							number: track.number,
							title: track.title,
							length: track.length ?? null
						});
					}
				}

				const simpleCredits: Credit[] = [];
				for (const r of rel.relations ?? []) {
					if (r['target-type'] === 'artist' && r.artist?.name && r.type) {
						simpleCredits.push({ name: r.artist.name, role: r.type });
					}
				}

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
					credits: simpleCredits,
					buyLinks
				};

				platformLinks = {
					bandcamp: streamingUrls.bandcamp ? [streamingUrls.bandcamp] : [],
					spotify: streamingUrls.spotify ? [streamingUrls.spotify] : [],
					soundcloud: streamingUrls.soundcloud ? [streamingUrls.soundcloud] : [],
					youtube: streamingUrls.youtube ? [streamingUrls.youtube] : [],
					wikipedia: [],
					other: []
				};
				hasAnyStream = Object.values(streamingUrls).some(Boolean);
			}
		}
	} catch { /* graceful degradation — release stays null */ }
	finally { clearTimeout(t); }

	return { mbid, slug, release, platformLinks, hasAnyStream, rawCredits };
};
