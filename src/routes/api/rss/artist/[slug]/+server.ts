import type { RequestHandler } from './$types';
import { Feed } from 'feed';
import { D1Provider } from '$lib/db/d1-provider';
import { getArtistBySlug } from '$lib/db/queries';

const SITE_URL = 'https://mercury.example';

/**
 * GET /api/rss/artist/[slug]
 *
 * Returns an RSS 2.0 or Atom 1.0 feed for a single artist page.
 * Format negotiation:
 *   - ?format=atom  → Atom 1.0
 *   - Accept: application/atom+xml → Atom 1.0
 *   - Default → RSS 2.0
 *
 * Feed is a snapshot of the artist's current state on Mercury —
 * useful for bloggers to subscribe and detect when tag data changes.
 */
export const GET: RequestHandler = async ({ params, request, platform, url }) => {
	if (!platform?.env?.DB) {
		return new Response('Database not available', { status: 503 });
	}

	const db = new D1Provider(platform.env.DB);
	const artist = await getArtistBySlug(db, params.slug);

	if (!artist) {
		return new Response('Artist not found', { status: 404 });
	}

	const wantAtom =
		url.searchParams.get('format') === 'atom' ||
		(request.headers.get('Accept') ?? '').includes('application/atom+xml');

	const contentType = wantAtom ? 'application/atom+xml' : 'application/rss+xml';
	const artistUrl = `${SITE_URL}/artist/${artist.slug}`;

	const tags = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];
	const countryStr = artist.country ? ` (${artist.country})` : '';
	const description = `${artist.name}${countryStr}${tags.length > 0 ? ` — ${tags.slice(0, 8).join(', ')}` : ''}`;

	const feed = new Feed({
		title: `${artist.name} — Mercury`,
		id: artistUrl,
		link: artistUrl,
		description,
		language: 'en',
		copyright: 'Data from MusicBrainz (CC0)',
		feedLinks: {
			rss: `${SITE_URL}/api/rss/artist/${artist.slug}`,
			atom: `${SITE_URL}/api/rss/artist/${artist.slug}?format=atom`
		}
	});

	// One item: the artist profile page entry (current state snapshot)
	// Cover art is best-effort (may 404 if no release group) — feed readers handle gracefully
	const coverArtUrl = `https://coverartarchive.org/release-group/${artist.mbid}/front-250`;
	const htmlDescription = `<img src="${coverArtUrl}" alt="${artist.name}" style="max-width:250px" /><p>${description}</p>`;

	feed.addItem({
		title: `${artist.name} on Mercury`,
		id: artistUrl,
		link: artistUrl,
		description,
		content: htmlDescription,
		date: new Date()
	});

	const xml = wantAtom ? feed.atom1() : feed.rss2();

	return new Response(xml, {
		headers: {
			'Content-Type': `${contentType}; charset=utf-8`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
