import type { RequestHandler } from './$types';
import { Feed } from 'feed';
import { D1Provider } from '$lib/db/d1-provider';

const SITE_URL = 'https://mercury.example';

/**
 * GET /api/rss/tag/[tag]
 *
 * Returns an RSS 2.0 or Atom 1.0 feed for artists tagged with the given tag.
 * Up to 50 artists, ordered by tag vote count descending (most-strongly-tagged first).
 *
 * Feed allows music bloggers to subscribe to a niche genre and discover
 * the artists Mercury indexes under that tag — the "subscribe to this niche" feature.
 *
 * Format negotiation:
 *   - ?format=atom  → Atom 1.0
 *   - Accept: application/atom+xml → Atom 1.0
 *   - Default → RSS 2.0
 */
export const GET: RequestHandler = async ({ params, request, platform, url }) => {
	if (!platform?.env?.DB) {
		return new Response('Database not available', { status: 503 });
	}

	const db = new D1Provider(platform.env.DB);

	// SvelteKit decodes params.tag automatically
	const decodedTag = params.tag;

	const artists = await db.all<{
		id: number;
		mbid: string;
		name: string;
		slug: string;
		country: string | null;
		tags: string | null;
	}>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country,
		        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 8) AS tags
		 FROM artists a
		 JOIN artist_tags at2 ON at2.artist_id = a.id
		 WHERE at2.tag = ? AND a.ended = 0
		 ORDER BY at2.count DESC
		 LIMIT 50`,
		decodedTag
	);

	if (artists.length === 0) {
		return new Response('Tag not found', { status: 404 });
	}

	const wantAtom =
		url.searchParams.get('format') === 'atom' ||
		(request.headers.get('Accept') ?? '').includes('application/atom+xml');

	const contentType = wantAtom ? 'application/atom+xml' : 'application/rss+xml';
	const tagUrl = `${SITE_URL}/discover?tags=${encodeURIComponent(decodedTag)}`;

	const feed = new Feed({
		title: `${decodedTag} — Mercury`,
		id: tagUrl,
		link: tagUrl,
		description: `Artists tagged ${decodedTag} on Mercury`,
		language: 'en',
		copyright: 'Data from MusicBrainz (CC0)',
		feedLinks: {
			rss: `${SITE_URL}/api/rss/tag/${encodeURIComponent(decodedTag)}`,
			atom: `${SITE_URL}/api/rss/tag/${encodeURIComponent(decodedTag)}?format=atom`
		}
	});

	for (const artist of artists) {
		const artistUrl = `${SITE_URL}/artist/${artist.slug}`;
		const coverArtUrl = `https://coverartarchive.org/release-group/${artist.mbid}/front-250`;
		const countryStr = artist.country ? ` (${artist.country})` : '';
		const artistTags = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];
		const desc = `${artist.name}${countryStr}${artistTags.length > 0 ? ` — ${artistTags.join(', ')}` : ''}`;
		const htmlDesc = `<img src="${coverArtUrl}" alt="${artist.name}" style="max-width:250px" /><p>${desc}</p>`;

		feed.addItem({
			title: artist.name,
			id: artistUrl,
			link: artistUrl,
			description: desc,
			content: htmlDesc,
			date: new Date()
		});
	}

	const xml = wantAtom ? feed.atom1() : feed.rss2();

	return new Response(xml, {
		headers: {
			'Content-Type': `${contentType}; charset=utf-8`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
