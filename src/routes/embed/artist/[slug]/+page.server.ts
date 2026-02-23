import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArtistBySlug } from '$lib/db/queries';
import { D1Provider } from '$lib/db/d1-provider';

export const load: PageServerLoad = async ({ params, platform, url }) => {
	const { slug } = params;

	// Guard: no D1 database available (e.g., during local dev without wrangler)
	if (!platform?.env?.DB) {
		return { artist: null, tags: [] as string[], coverArt: '', bio: null, siteUrl: '' };
	}

	const provider = new D1Provider(platform.env.DB);
	const artist = await getArtistBySlug(provider, slug);

	if (!artist) {
		throw error(404, 'Artist not found');
	}

	// Parse tags from comma-separated string
	const tags: string[] = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];

	// Cover art from Cover Art Archive — best-effort, may 404 if no release groups.
	// The embed page handles missing images gracefully via onerror.
	const coverArt = `https://coverartarchive.org/release-group/${artist.mbid}/front-250`;

	// D1 has no bio column — using tag summary as bio snippet per Phase 12 decision.
	// MusicBrainz does not store bio text in the local DB; we use a tag-derived descriptor
	// as a one-line artist summary without requiring a separate API call.
	const bio: string | null = tags.length > 0 ? tags.slice(0, 4).join(' · ') : null;

	return {
		artist,
		tags,
		coverArt,
		bio,
		siteUrl: url.origin
	};
};
