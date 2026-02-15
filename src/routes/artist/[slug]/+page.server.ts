import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArtistBySlug } from '$lib/db/queries';
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
		throw error(503, 'Database not available');
	}

	const artist = await getArtistBySlug(db, slug);
	if (!artist) {
		throw error(404, 'Artist not found');
	}

	// Parallel fetch: releases, links, bio
	let links: PlatformLinks = EMPTY_LINKS;
	let categorizedLinks: CategorizedLinks = emptyCategorizedLinks();
	let releases: ReleaseGroup[] = [];
	let bio: string | null = null;

	// Fire all three requests concurrently
	const [linksResult, releasesResult] = await Promise.allSettled([
		fetch(`/api/artist/${artist.mbid}/links`),
		fetch(`/api/artist/${artist.mbid}/releases`)
	]);

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
		bio
	};
};
