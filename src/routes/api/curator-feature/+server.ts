/**
 * GET /api/curator-feature
 *
 * Fire-and-forget attribution recording endpoint.
 * Called by embed.js on external blogger sites when an artist embed card loads.
 * Also called by the Tauri client when an artist is added to a public collection.
 *
 * Query params:
 *   artist  — artist MBID (UUID format) — use for direct attribution
 *   slug    — artist slug — alternative to MBID, for embed.js which knows slug from embed URL
 *   curator — blogger's handle (alphanumeric + hyphens/underscores/dots, 1-50 chars)
 *   source  — 'embed' (default) | 'collection'
 *
 * Returns 200 always (fire-and-forget — never break the blogger's page load).
 * Returns 400 only for invalid/missing required params (so embed.js can detect misconfiguration).
 *
 * CORS: Access-Control-Allow-Origin: * — embed.js on external sites calls this cross-origin.
 */

import type { RequestHandler } from './$types';
import { D1Provider } from '$lib/db/d1-provider';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const GET: RequestHandler = async ({ url, platform }) => {
	// Guard: no D1 database (local dev without wrangler)
	if (!platform?.env?.DB) {
		return new Response('ok', { status: 200, headers: CORS_HEADERS });
	}

	const artistParam = url.searchParams.get('artist');
	const slugParam = url.searchParams.get('slug');
	const curatorHandle = url.searchParams.get('curator');
	const sourceParam = url.searchParams.get('source') ?? 'embed';

	// Validate: curator handle required
	if (!curatorHandle) {
		return new Response('Missing curator param', { status: 400, headers: CORS_HEADERS });
	}

	// Validate: at least one of artist (MBID) or slug required
	if (!artistParam && !slugParam) {
		return new Response('Missing artist or slug param', { status: 400, headers: CORS_HEADERS });
	}

	// Validate curator handle: alphanumeric + hyphens/underscores/dots, 1-50 chars
	// Prevents XSS/injection from arbitrary handle values stored in DB
	if (!/^[\w\-.]{1,50}$/.test(curatorHandle)) {
		return new Response('Invalid curator handle', { status: 400, headers: CORS_HEADERS });
	}

	// Validate source: only allow known values, default to 'embed'
	const source = sourceParam === 'collection' ? 'collection' : 'embed';

	try {
		const provider = new D1Provider(platform.env.DB);
		let artistMbid: string;

		if (artistParam) {
			// MBID path: validate UUID format
			if (!/^[0-9a-f-]{36}$/.test(artistParam)) {
				return new Response('Invalid artist MBID format', { status: 400, headers: CORS_HEADERS });
			}
			artistMbid = artistParam;
		} else {
			// Slug path (for embed.js which knows the slug from the embed URL)
			if (!/^[a-z0-9-]{1,100}$/.test(slugParam!)) {
				return new Response('Invalid slug format', { status: 400, headers: CORS_HEADERS });
			}

			const artist = await provider.get<{ mbid: string }>(
				'SELECT mbid FROM artists WHERE slug = ? LIMIT 1',
				slugParam
			);

			if (!artist) {
				return new Response('Artist not found', { status: 400, headers: CORS_HEADERS });
			}

			artistMbid = artist.mbid;
		}

		// INSERT OR IGNORE — UNIQUE(artist_mbid, curator_handle) deduplicates naturally
		// Same curator+artist pair is only recorded once (natural rate limiting)
		await provider.all(
			`INSERT OR IGNORE INTO curator_features (artist_mbid, curator_handle, featured_at, source)
       VALUES (?, ?, ?, ?)`,
			artistMbid,
			curatorHandle,
			Date.now(),
			source
		);

		return new Response('ok', { status: 200, headers: CORS_HEADERS });
	} catch {
		// Fire-and-forget: never break the blogger's page load on DB errors
		// (e.g., curator_features table doesn't exist on older DB versions)
		return new Response('ok', { status: 200, headers: CORS_HEADERS });
	}
};
