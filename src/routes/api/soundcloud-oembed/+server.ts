/**
 * SoundCloud oEmbed proxy.
 *
 * SoundCloud's oEmbed endpoint doesn't support CORS, so we proxy requests
 * through our server for on-demand embed loading when a user clicks play
 * on a specific release's SoundCloud link.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const scUrl = url.searchParams.get('url');

	if (!scUrl) {
		throw error(400, 'Missing url parameter');
	}

	// Validate it's actually a SoundCloud URL
	try {
		const parsed = new URL(scUrl);
		if (!parsed.hostname.includes('soundcloud.com')) {
			throw error(400, 'URL must be a SoundCloud URL');
		}
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(400, 'Invalid URL');
	}

	try {
		const oembedResponse = await fetch(
			`https://soundcloud.com/oembed?url=${encodeURIComponent(scUrl)}&format=json&maxheight=166`
		);

		if (!oembedResponse.ok) {
			throw error(502, `SoundCloud oEmbed returned ${oembedResponse.status}`);
		}

		const data = (await oembedResponse.json()) as { html?: string };

		return json({ html: data.html ?? null }, {
			headers: {
				'Cache-Control': 'public, max-age=86400'
			}
		});
	} catch (e) {
		if (e && typeof e === 'object' && 'status' in e) throw e;
		throw error(502, 'Failed to reach SoundCloud oEmbed API');
	}
};
