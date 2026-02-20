/**
 * Universal load function for the artist page.
 *
 * Coexists with +page.server.ts:
 * - Web (SSR): data comes from +page.server.ts, returned unchanged.
 * - Desktop (Tauri SPA, ssr=false): queries local SQLite for artist data,
 *   fetches links/releases/bio from MusicBrainz and Wikipedia client-side.
 *
 * All external API calls are best-effort: the artist page renders from
 * local DB data alone (name, tags, country) if any fetch fails.
 *
 * Dynamic imports keep Tauri dependencies out of the web bundle.
 */

import { isTauri } from '$lib/platform';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { PlatformLinks, CategorizedLinks, ReleaseGroup } from '$lib/embeds/types';

const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';

export const load: PageLoad = async ({ params, data, fetch }) => {
	// Web SSR: data comes from +page.server.ts
	if (!isTauri()) {
		return data;
	}

	// Tauri desktop: query local database + fetch external data
	const { getProvider } = await import('$lib/db/provider');
	const { getArtistBySlug, getArtistUniquenessScore } = await import('$lib/db/queries');

	const { slug } = params;
	const provider = await getProvider();
	const artist = await getArtistBySlug(provider, slug);

	if (!artist) {
		throw error(404, 'Artist not found');
	}

	// Fetch uniqueness score concurrently with external data
	const uniquenessData = await getArtistUniquenessScore(provider, artist.id);

	// Initialize empty external data -- populated by best-effort fetches below
	let links: PlatformLinks = {
		bandcamp: [],
		spotify: [],
		soundcloud: [],
		youtube: [],
		wikipedia: [],
		other: []
	};
	let categorizedLinks: CategorizedLinks = {
		streaming: [],
		social: [],
		official: [],
		info: [],
		support: [],
		other: []
	};
	let releases: ReleaseGroup[] = [];
	let bio: string | null = null;

	// Fetch external data (best-effort -- artist page renders from DB data alone on failure)
	try {
		// --- Links from MusicBrainz ---
		const mbLinksResponse = await fetch(
			`https://musicbrainz.org/ws/2/artist/${artist.mbid}?inc=url-rels&fmt=json`,
			{
				headers: {
					'User-Agent': USER_AGENT,
					Accept: 'application/json'
				}
			}
		);

		if (mbLinksResponse.ok) {
			const mbData = (await mbLinksResponse.json()) as {
				relations?: Array<{
					'target-type'?: string;
					type?: string;
					url?: { resource?: string };
				}>;
			};

			const { categorizeByRelationType, detectPlatform, labelFromUrl, emptyCategorizedLinks } =
				await import('$lib/embeds/categorize');

			categorizedLinks = emptyCategorizedLinks();
			const seen = new Set<string>();

			if (mbData.relations) {
				for (const rel of mbData.relations) {
					if (rel['target-type'] === 'url' && rel.url?.resource) {
						const url = rel.url.resource;
						if (seen.has(url)) continue;
						seen.add(url);

						// Legacy format (for backward compat with existing component)
						try {
							const hostname = new URL(url).hostname;
							if (hostname.includes('bandcamp.com')) links.bandcamp.push(url);
							else if (hostname.includes('open.spotify.com') || hostname === 'spotify.com')
								links.spotify.push(url);
							else if (hostname.includes('soundcloud.com')) links.soundcloud.push(url);
							else if (hostname.includes('youtube.com') || hostname === 'youtu.be')
								links.youtube.push(url);
							else if (hostname.includes('wikipedia.org')) links.wikipedia.push(url);
							else links.other.push(url);
						} catch {
							links.other.push(url);
						}

						// Categorized format
						const category = rel.type ? categorizeByRelationType(rel.type) : 'other';
						const platform = detectPlatform(url);
						const finalCategory = platform ? 'streaming' : category;
						categorizedLinks[finalCategory].push({ url, label: labelFromUrl(url) });
					}
				}
			}
		}
	} catch (err) {
		console.error('Links fetch error:', err);
	}

	// --- Releases from MusicBrainz ---
	try {
		const mbReleasesResponse = await fetch(
			`https://musicbrainz.org/ws/2/release-group?artist=${artist.mbid}&inc=url-rels&type=album|single|ep&fmt=json&limit=50`,
			{
				headers: {
					'User-Agent': USER_AGENT,
					Accept: 'application/json'
				}
			}
		);

		if (mbReleasesResponse.ok) {
			const { detectPlatform } = await import('$lib/embeds/categorize');

			const mbRelData = (await mbReleasesResponse.json()) as {
				'release-groups'?: Array<{
					id: string;
					title: string;
					'first-release-date'?: string;
					'primary-type'?: string;
					relations?: Array<{
						'target-type'?: string;
						url?: { resource?: string };
					}>;
				}>;
			};

			if (mbRelData['release-groups']) {
				releases = mbRelData['release-groups'].map((rg) => {
					const dateStr = rg['first-release-date'];
					const year = dateStr ? parseInt(dateStr.substring(0, 4), 10) || null : null;

					// Extract streaming links from URL relationships
					const releaseLinks: import('$lib/embeds/types').ReleaseLink[] = [];
					if (rg.relations) {
						for (const rel of rg.relations) {
							if (rel['target-type'] === 'url' && rel.url?.resource) {
								const platform = detectPlatform(rel.url.resource);
								if (platform) {
									releaseLinks.push({ url: rel.url.resource, platform });
								}
							}
						}
					}

					// Normalize type
					let type: ReleaseGroup['type'] = 'Other';
					if (rg['primary-type'] === 'Album') type = 'Album';
					else if (rg['primary-type'] === 'EP') type = 'EP';
					else if (rg['primary-type'] === 'Single') type = 'Single';

					return {
						mbid: rg.id,
						title: rg.title,
						year,
						type,
						coverArtUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
						links: releaseLinks
					};
				});

				// Sort by year descending (newest first), nulls last
				releases.sort((a, b) => {
					if (a.year === null && b.year === null) return 0;
					if (a.year === null) return 1;
					if (b.year === null) return -1;
					return b.year - a.year;
				});
			}
		}
	} catch (err) {
		console.error('Releases fetch error:', err);
	}

	// --- Wikipedia bio ---
	try {
		if (links.wikipedia.length > 0) {
			const { fetchWikipediaBio } = await import('$lib/bio');
			bio = await fetchWikipediaBio(links.wikipedia[0]);
		}
	} catch (err) {
		console.error('Bio fetch error:', err);
	}

	return {
		artist,
		links,
		categorizedLinks,
		releases,
		bio,
		uniquenessScore: uniquenessData?.uniqueness_score ?? null,
		uniquenessTagCount: uniquenessData?.tag_count ?? 0
	};
};
