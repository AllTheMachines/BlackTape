import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getArtistBySlug } from '$lib/db/queries';
import { fetchWikipediaBio } from '$lib/bio';
import { soundcloudOembedUrl } from '$lib/embeds/soundcloud';
import type { PlatformLinks } from '$lib/embeds/types';

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

	// Fetch external links from MusicBrainz proxy (best-effort)
	let links: PlatformLinks = EMPTY_LINKS;
	let bio: string | null = null;
	let soundcloudEmbedHtml: string | undefined = undefined;

	try {
		const linksResponse = await fetch(`/api/artist/${artist.mbid}/links`);
		if (linksResponse.ok) {
			links = (await linksResponse.json()) as PlatformLinks;
		}
	} catch {
		// MusicBrainz proxy failed — page still renders with DB data
	}

	// Fetch Wikipedia bio (best-effort)
	if (links.wikipedia.length > 0) {
		bio = await fetchWikipediaBio(links.wikipedia[0]);
	}

	// Fetch SoundCloud oEmbed HTML server-side (best-effort)
	if (links.soundcloud.length > 0) {
		try {
			const oembedUrl = soundcloudOembedUrl(links.soundcloud[0]);
			const oembedResponse = await fetch(oembedUrl);
			if (oembedResponse.ok) {
				const oembedData = (await oembedResponse.json()) as { html?: string };
				soundcloudEmbedHtml = oembedData.html ?? undefined;
			}
		} catch {
			// SoundCloud oEmbed failed — will show external link fallback
		}
	}

	return {
		artist,
		links,
		bio,
		soundcloudEmbedHtml
	};
};
