/**
 * Load function for the artist page — Tauri desktop only.
 *
 * Queries local SQLite for artist data, fetches links/releases/bio from
 * MusicBrainz and Wikipedia client-side. All external API calls are
 * best-effort: the page renders from local DB data alone if any fetch fails.
 */

import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { PlatformLinks, CategorizedLinks, ReleaseGroup } from '$lib/embeds/types';

const USER_AGENT = 'Mercury/0.1.0 (https://github.com/user/mercury)';

export const load: PageLoad = async ({ params, fetch }) => {
	const { getProvider } = await import('$lib/db/provider');
	const { getArtistBySlug, getArtistUniquenessScore } = await import('$lib/db/queries');

	const { slug } = params;
	const provider = await getProvider();
	const artist = await getArtistBySlug(provider, slug);

	if (!artist) {
		throw error(404, 'Artist not found');
	}

	let uniquenessData = null;
	try {
		uniquenessData = await getArtistUniquenessScore(provider, artist.id);
	} catch {
		// tag_stats table missing — badge simply won't render
	}

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

	try {
		const mbLinksResponse = await fetch(
			`https://musicbrainz.org/ws/2/artist/${artist.mbid}?inc=url-rels&fmt=json`,
			{ headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }
		);

		if (mbLinksResponse.ok) {
			const mbData = (await mbLinksResponse.json()) as {
				relations?: Array<{
					'target-type'?: string;
					type?: string;
					url?: { resource?: string };
				}>;
			};

			const { categorizeByRelationType, detectPlatform, labelFromUrl, emptyCategorizedLinks, filterDeadLinks } =
				await import('$lib/embeds/categorize');

			categorizedLinks = emptyCategorizedLinks();
			const seen = new Set<string>();

			if (mbData.relations) {
				// #26 fix: track URLs that came from 'official homepage' MB type so we can sort them first
				const officialHomepageUrls = new Set<string>();

				for (const rel of mbData.relations) {
					if (rel['target-type'] === 'url' && rel.url?.resource) {
						const url = rel.url.resource;
						if (seen.has(url)) continue;
						seen.add(url);

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

						const category = rel.type ? categorizeByRelationType(rel.type) : 'other';
						const platform = detectPlatform(url);
						const finalCategory = platform ? 'streaming' : category;

						// Track official homepage URLs for post-loop sort
						if (rel.type === 'official homepage' && finalCategory === 'official') {
							officialHomepageUrls.add(url);
						}

						categorizedLinks[finalCategory].push({ url, label: labelFromUrl(url) });
					}
				}

				// Sort official links: 'official homepage' type URLs appear first
				if (categorizedLinks.official.length > 1) {
					categorizedLinks.official.sort((a, b) => {
						const aFirst = officialHomepageUrls.has(a.url) ? -1 : 0;
						const bFirst = officialHomepageUrls.has(b.url) ? -1 : 0;
						return aFirst - bFirst;
					});
				}
			}

			// #27 fix: remove known-dead domain links
			for (const category of Object.keys(categorizedLinks) as Array<keyof typeof categorizedLinks>) {
				categorizedLinks[category] = filterDeadLinks(categorizedLinks[category]);
			}
		}

		// Deduplicate streaming links by hostname (MusicBrainz sometimes has two Deezer URLs, etc.)
		const seenStreamingHosts = new Set<string>();
		categorizedLinks.streaming = categorizedLinks.streaming.filter((item) => {
			try {
				const host = new URL(item.url).hostname;
				if (seenStreamingHosts.has(host)) return false;
				seenStreamingHosts.add(host);
				return true;
			} catch { return true; }
		});

	} catch (err) {
		console.error('Links fetch error:', err);
	}

	try {
		const mbReleasesResponse = await fetch(
			`https://musicbrainz.org/ws/2/release-group?artist=${artist.mbid}&inc=url-rels&type=album|single|ep&fmt=json&limit=50`,
			{ headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }
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

					const releaseLinks: import('$lib/embeds/types').ReleaseLink[] = [];
					if (rg.relations) {
						for (const rel of rg.relations) {
							if (rel['target-type'] === 'url' && rel.url?.resource) {
								const platform = detectPlatform(rel.url.resource);
								if (platform) releaseLinks.push({ url: rel.url.resource, platform });
							}
						}
					}

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

	try {
		if (links.wikipedia.length > 0) {
			const { fetchWikipediaBio } = await import('$lib/bio');
			bio = await fetchWikipediaBio(links.wikipedia[0]);
		}
	} catch (err) {
		console.error('Bio fetch error:', err);
	}

	// Fetch MusicBrainz artist relationships (members, influences, labels)
	interface ArtistRelationships {
		members: Array<{ name: string; mbid: string }>;
		influencedBy: Array<{ name: string; mbid: string }>;
		influenced: Array<{ name: string; mbid: string }>;
		labels: string[];
	}

	let relationships: ArtistRelationships = { members: [], influencedBy: [], influenced: [], labels: [] };

	try {
		const mbRelsResponse = await fetch(
			`https://musicbrainz.org/ws/2/artist/${artist.mbid}?inc=artist-rels+label-rels&fmt=json`,
			{ headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } }
		);

		if (mbRelsResponse.ok) {
			const mbRelsData = (await mbRelsResponse.json()) as {
				relations?: Array<{
					'target-type'?: string;
					type?: string;
					direction?: string;
					artist?: { name: string; id: string };
					label?: { name: string; id: string };
				}>;
			};

			if (mbRelsData.relations) {
				for (const rel of mbRelsData.relations) {
					if (rel['target-type'] === 'artist' && rel.artist) {
						if (rel.type === 'member of band' && rel.direction === 'backward') {
							relationships.members.push({ name: rel.artist.name, mbid: rel.artist.id });
						} else if (rel.type === 'influenced by' && rel.direction === 'forward') {
							relationships.influencedBy.push({ name: rel.artist.name, mbid: rel.artist.id });
						} else if (rel.type === 'influenced by' && rel.direction === 'backward') {
							relationships.influenced.push({ name: rel.artist.name, mbid: rel.artist.id });
						}
					} else if (rel['target-type'] === 'label' && rel.label?.name) {
						relationships.labels.push(rel.label.name);
					}
				}
			}
		}
	} catch (err) {
		console.error('Relationships fetch error:', err);
	}

	// Load curator attribution from local DB
	let curators: Array<{ curator_handle: string; featured_at: number }> = [];
	try {
		curators = await provider.all<{ curator_handle: string; featured_at: number }>(
			`SELECT curator_handle, MIN(featured_at) as featured_at
       FROM curator_features
       WHERE artist_mbid = ?
       GROUP BY curator_handle
       ORDER BY featured_at ASC
       LIMIT 10`,
			artist.mbid
		);
	} catch {
		// curator_features may not exist on older DB versions — degrade gracefully
	}

	return {
		artist,
		links,
		categorizedLinks,
		releases,
		bio,
		uniquenessScore: uniquenessData?.uniqueness_score ?? null,
		uniquenessTagCount: uniquenessData?.tag_count ?? 0,
		curators,
		relationships
	};
};
