import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArtistBySlug, getArtistUniquenessScore } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';
import { fetchWikipediaBio } from '$lib/bio';
import type { PlatformLinks, CategorizedLinks, ReleaseGroup } from '$lib/embeds/types';
import { emptyCategorizedLinks } from '$lib/embeds/categorize';

const EMPTY_LINKS: PlatformLinks = {
	bandcamp: [],
	spotify: [],
	soundcloud: [],
	youtube: [],
	wikipedia: [],
	other: []
};

export const load: PageServerLoad = async ({ params, platform, fetch }) => {
	const { slug } = params;

	const db = platform?.env?.DB;
	if (!db) {
		// No D1 database (e.g., Tauri dev mode) — return empty data.
		// The universal +page.ts load will detect Tauri and query local SQLite.
		return {
			artist: { name: '', mbid: '', slug, tags: '', country: '', type: '', begin_year: null, ended: false },
			links: EMPTY_LINKS,
			categorizedLinks: emptyCategorizedLinks(),
			releases: [] as ReleaseGroup[],
			bio: null as string | null,
			uniquenessScore: null as number | null,
			uniquenessTagCount: 0
		};
	}

	const provider = new D1Provider(db);

	const artist = await getArtistBySlug(provider, slug);
	if (!artist) {
		throw error(404, 'Artist not found');
	}

	// Parallel fetch: releases, links, bio, and uniqueness score
	let links: PlatformLinks = EMPTY_LINKS;
	let categorizedLinks: CategorizedLinks = emptyCategorizedLinks();
	let releases: ReleaseGroup[] = [];
	let bio: string | null = null;

	// Fire network requests and DB uniqueness score concurrently
	// getArtistUniquenessScore may fail if tag_stats isn't yet populated — degrade gracefully
	const [[linksResult, releasesResult], uniquenessResult] = await Promise.all([
		Promise.allSettled([
			fetch(`/api/artist/${artist.mbid}/links`),
			fetch(`/api/artist/${artist.mbid}/releases`)
		]),
		getArtistUniquenessScore(provider, artist.id).catch(() => null)
	]);
	const uniquenessData = uniquenessResult;

	// Process links response
	if (linksResult.status === 'fulfilled' && linksResult.value.ok) {
		const data = (await linksResult.value.json()) as {
			legacy: PlatformLinks;
			categorized: CategorizedLinks;
		};
		links = data.legacy;
		categorizedLinks = data.categorized;
	}

	// Process releases response
	if (releasesResult.status === 'fulfilled' && releasesResult.value.ok) {
		releases = (await releasesResult.value.json()) as ReleaseGroup[];
	}

	// Fetch Wikipedia bio (depends on links being resolved)
	if (links.wikipedia.length > 0) {
		bio = await fetchWikipediaBio(links.wikipedia[0]);
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
