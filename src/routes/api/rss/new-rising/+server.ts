import type { RequestHandler } from './$types';
import { Feed } from 'feed';
import { D1Provider } from '$lib/db/d1-provider';

const SITE_URL = 'https://mercury.example';

/**
 * GET /api/rss/new-rising
 *
 * Returns an RSS 2.0 or Atom 1.0 feed of niche artists that are gaining traction —
 * the same "Gaining Traction" list from the New & Rising page. This is the most
 * useful feed for a music blogger: a curated weekly subscription to artists worth
 * writing about.
 *
 * Uses the same gaining-traction query as /api/new-rising: recently active artists
 * ordered by average tag rarity (AVG(1/artist_count) DESC).
 *
 * Format negotiation:
 *   - ?format=atom  → Atom 1.0
 *   - Accept: application/atom+xml → Atom 1.0
 *   - Default → RSS 2.0
 */
export const GET: RequestHandler = async ({ request, platform, url }) => {
	if (!platform?.env?.DB) {
		return new Response('Database not available', { status: 503 });
	}

	const db = new D1Provider(platform.env.DB);
	const currentYear = new Date().getFullYear();
	const cutoffYear = currentYear - 1;

	const artists = await db.all<{
		id: number;
		mbid: string;
		name: string;
		slug: string;
		country: string | null;
		begin_year: number | null;
		tags: string | null;
	}>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country, a.begin_year,
		        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
		 FROM artists a
		 WHERE a.begin_year >= ? AND a.ended = 0
		   AND a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
		 ORDER BY (
		   SELECT AVG(1.0 / NULLIF(ts.artist_count, 0))
		   FROM artist_tags at2
		   JOIN tag_stats ts ON ts.tag = at2.tag
		   WHERE at2.artist_id = a.id
		 ) DESC
		 LIMIT 30`,
		cutoffYear
	);

	const wantAtom =
		url.searchParams.get('format') === 'atom' ||
		(request.headers.get('Accept') ?? '').includes('application/atom+xml');

	const contentType = wantAtom ? 'application/atom+xml' : 'application/rss+xml';
	const feedUrl = `${SITE_URL}/new-rising`;

	const feed = new Feed({
		title: `New & Rising — Mercury`,
		id: feedUrl,
		link: feedUrl,
		description: 'Niche artists gaining traction right now',
		language: 'en',
		copyright: 'Data from MusicBrainz (CC0)',
		feedLinks: {
			rss: `${SITE_URL}/api/rss/new-rising`,
			atom: `${SITE_URL}/api/rss/new-rising?format=atom`
		}
	});

	for (const artist of artists) {
		const artistUrl = `${SITE_URL}/artist/${artist.slug}`;
		const coverArtUrl = `https://coverartarchive.org/release-group/${artist.mbid}/front-250`;
		const countryStr = artist.country ? ` (${artist.country})` : '';
		const yearStr = artist.begin_year ? ` · ${artist.begin_year}` : '';
		const artistTags = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];
		const desc = `${artist.name}${countryStr}${yearStr}${artistTags.length > 0 ? ` — ${artistTags.join(', ')}` : ''}`;
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
