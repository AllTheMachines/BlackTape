import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unfurl } from 'unfurl.js';

/**
 * POST /api/unfurl
 *
 * Accepts: { url: string } — a Mercury page URL
 * Returns: UnfurlCard (title, description?, image?, url) or error
 *
 * Security: Only processes URLs on the same origin as the requesting page.
 * Cache-Control: max-age=3600 — unfurl results don't change frequently.
 *
 * Server-only: unfurl.js is a Node/server package. Never import it in client code.
 */
export const POST: RequestHandler = async ({ request }) => {
	let url: string;

	try {
		const body = await request.json() as { url?: unknown };
		url = typeof body.url === 'string' ? body.url.trim() : '';
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	if (!url) {
		return json({ error: 'Missing url' }, { status: 400 });
	}

	// Derive the site origin from the request URL — works across all environments
	// (local dev, Cloudflare Pages preview, production). Only Mercury URLs are processed.
	const siteOrigin = new URL(request.url).origin;

	if (!url.startsWith(siteOrigin)) {
		return json({ error: 'Not a Mercury URL' }, { status: 400 });
	}

	try {
		const meta = await unfurl(url);

		const card = {
			title: meta.open_graph?.title ?? meta.title ?? url,
			description: meta.open_graph?.description ?? meta.description,
			image: meta.open_graph?.images?.[0]?.url,
			url
		};

		return json(card, {
			headers: {
				'Cache-Control': 'max-age=3600'
			}
		});
	} catch {
		// Graceful degradation — link still shows without preview metadata
		return json({ url }, {
			headers: {
				'Cache-Control': 'max-age=3600'
			}
		});
	}
};
