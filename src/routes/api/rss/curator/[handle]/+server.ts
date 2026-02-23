import type { RequestHandler } from './$types';
import { Feed } from 'feed';
import { D1Provider } from '$lib/db/d1-provider';

const SITE_URL = 'https://mercury.example';

/**
 * GET /api/rss/curator/[handle]
 *
 * Returns an RSS 2.0 or Atom 1.0 feed of artists that a curator has featured.
 * Results are ordered by first-featured date descending (most recently featured first).
 *
 * The curator_features table is created in Plan 03. If the table does not yet
 * exist, this endpoint returns a valid empty feed with a descriptive message
 * rather than a 500 error — graceful degradation during phased rollout.
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
	const handle = params.handle;

	const wantAtom =
		url.searchParams.get('format') === 'atom' ||
		(request.headers.get('Accept') ?? '').includes('application/atom+xml');

	const contentType = wantAtom ? 'application/atom+xml' : 'application/rss+xml';
	const curatorUrl = `${SITE_URL}/profile`;

	const feed = new Feed({
		title: `${handle}'s Discoveries — Mercury`,
		id: curatorUrl,
		link: curatorUrl,
		description: `Artists featured by ${handle} on Mercury`,
		language: 'en',
		copyright: 'Data from MusicBrainz (CC0)',
		feedLinks: {
			rss: `${SITE_URL}/api/rss/curator/${encodeURIComponent(handle)}`,
			atom: `${SITE_URL}/api/rss/curator/${encodeURIComponent(handle)}?format=atom`
		}
	});

	// Try to query curator_features — table may not exist until Plan 03
	let features: Array<{ artist_mbid: string; first_featured: string }> = [];
	try {
		features = await db.all<{ artist_mbid: string; first_featured: string }>(
			`SELECT artist_mbid, MIN(featured_at) as first_featured
			 FROM curator_features
			 WHERE curator_handle = ?
			 GROUP BY artist_mbid
			 ORDER BY first_featured DESC
			 LIMIT 50`,
			handle
		);
	} catch {
		// curator_features table doesn't exist yet — return empty feed gracefully
		const xml = wantAtom ? feed.atom1() : feed.rss2();
		return new Response(xml, {
			headers: {
				'Content-Type': `${contentType}; charset=utf-8`,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	}

	// For each featured artist, look up their details
	for (const feature of features) {
		const artist = await db.get<{
			name: string;
			slug: string;
			tags: string | null;
			country: string | null;
		}>(
			`SELECT name, slug,
			        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 8) AS tags,
			        country
			 FROM artists a
			 WHERE mbid = ?`,
			feature.artist_mbid
		);

		if (!artist) continue;

		const artistUrl = `${SITE_URL}/artist/${artist.slug}`;
		const coverArtUrl = `https://coverartarchive.org/release-group/${feature.artist_mbid}/front-250`;
		const countryStr = artist.country ? ` (${artist.country})` : '';
		const artistTags = artist.tags ? artist.tags.split(', ').filter(Boolean) : [];
		const desc = `${artist.name}${countryStr}${artistTags.length > 0 ? ` — ${artistTags.join(', ')}` : ''} — featured by ${handle}`;
		const htmlDesc = `<img src="${coverArtUrl}" alt="${artist.name}" style="max-width:250px" /><p>${desc}</p>`;

		feed.addItem({
			title: artist.name,
			id: artistUrl,
			link: artistUrl,
			description: desc,
			content: htmlDesc,
			date: new Date(feature.first_featured)
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
