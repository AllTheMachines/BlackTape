/**
 * Universal load for the release detail page.
 *
 * Web (SSR): data from +page.server.ts — returned unchanged.
 * Tauri desktop: fetches MusicBrainz directly, builds buy links
 *   WITHOUT affiliate coding (no server env in Tauri context).
 *   Links still function as useful search fallbacks.
 */

import { isTauri } from '$lib/platform';
import type { PageLoad } from './$types';
import type { ReleaseDetail, Track, Credit } from './+page.server';

const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';

export const load: PageLoad = async ({ params, data, fetch }) => {
	// Web SSR: server data is already complete
	if (!isTauri()) {
		return data;
	}

	// Tauri: fetch release data from MusicBrainz directly
	const { mbid, slug } = params;

	let release: ReleaseDetail | null = null;

	try {
		const mbUrl = `https://musicbrainz.org/ws/2/release?release-group=${mbid}&inc=recordings+artist-credits+media+artist-rels&limit=1&fmt=json`;
		const resp = await fetch(mbUrl, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
		});

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
						artist?: { name: string };
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
							length: track.length ?? null,
						});
					}
				}

				const credits: Credit[] = [];
				for (const r of rel.relations ?? []) {
					if (r['target-type'] === 'artist' && r.artist?.name && r.type) {
						credits.push({ name: r.artist.name, role: r.type });
					}
				}

				// Detect Bandcamp URL from release relations
				let bandcampUrl: string | null = null;
				for (const r of rel.relations ?? []) {
					if (r['target-type'] === 'url' && r.url?.resource) {
						try {
							if (new URL(r.url.resource).hostname.includes('bandcamp.com')) {
								bandcampUrl = r.url.resource;
								break;
							}
						} catch { /* skip */ }
					}
				}

				const artistName = rel['artist-credit']?.[0]?.artist?.name
					?? rel['artist-credit']?.[0]?.name
					?? '';

				const year = rel.date ? parseInt(rel.date.substring(0, 4), 10) || null : null;

				// Build buy links WITHOUT affiliate IDs — no server env in Tauri
				// Links still work as useful (non-coded) search fallbacks
				const { buildBuyLinks } = await import('$lib/affiliates/construct');
				const buyLinks = buildBuyLinks(artistName, rel.title, bandcampUrl, {
					amazonTag: null,
					appleToken: null,
					appleCampaign: null,
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
					buyLinks,
				};
			}
		}
	} catch (err) {
		console.error('Release fetch error (Tauri):', err);
		// release remains null — page handles gracefully
	}

	return { release, slug, mbid };
};
