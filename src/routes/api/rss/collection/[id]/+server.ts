import type { RequestHandler } from './$types';
import { Feed } from 'feed';

const SITE_URL = 'https://mercury.example';

/**
 * GET /api/rss/collection/[id]
 *
 * Collections live in taste.db on the desktop app (Tauri-only).
 * The web does not have access to user collections, so this endpoint
 * returns a valid but empty RSS feed with a descriptive explanation.
 *
 * This is intentional: returning 404 would break feed readers that have
 * already subscribed. An empty feed with a clear description is the
 * honest, user-friendly approach.
 *
 * Format negotiation:
 *   - ?format=atom  → Atom 1.0
 *   - Accept: application/atom+xml → Atom 1.0
 *   - Default → RSS 2.0
 */
export const GET: RequestHandler = async ({ params, request, url }) => {
	const wantAtom =
		url.searchParams.get('format') === 'atom' ||
		(request.headers.get('Accept') ?? '').includes('application/atom+xml');

	const contentType = wantAtom ? 'application/atom+xml' : 'application/rss+xml';
	const collectionUrl = `${SITE_URL}/profile`;

	const feed = new Feed({
		title: `Collection ${params.id} — BlackTape (Desktop Only)`,
		id: collectionUrl,
		link: collectionUrl,
		description:
			'This collection feed requires the BlackTape desktop app. ' +
			'Download the app to manage collections and export them as RSS feeds.',
		language: 'en',
		copyright: 'Data from MusicBrainz (CC0)',
		feedLinks: {
			rss: `${SITE_URL}/api/rss/collection/${params.id}`,
			atom: `${SITE_URL}/api/rss/collection/${params.id}?format=atom`
		}
	});

	// Zero items — collections are desktop-only
	const xml = wantAtom ? feed.atom1() : feed.rss2();

	return new Response(xml, {
		headers: {
			'Content-Type': `${contentType}; charset=utf-8`,
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
