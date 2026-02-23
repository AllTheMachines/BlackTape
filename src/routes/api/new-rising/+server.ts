import type { RequestHandler } from './$types';
import { D1Provider } from '$lib/db/d1-provider';
import { json } from '@sveltejs/kit';

/**
 * GET /api/new-rising
 *
 * Returns two discovery lists for the New & Rising page:
 * - newArtists: recently active artists (begin_year >= currentYear - 1)
 * - gainingTraction: niche artists with high average tag rarity, recently active
 * - curatorArtists: (optional) artists featured by a specific curator handle
 *
 * Proxy note: begin_year is used as a recency signal because artist_tags has
 * no added_at column. This is documented in RESEARCH.md as an intentional
 * approximation — the index reflects when an artist became active, not when
 * they were added to Mercury's catalog.
 */
export const GET: RequestHandler = async ({ platform, url }) => {
	if (!platform?.env?.DB) {
		return json({ newArtists: [], gainingTraction: [], curatorArtists: [] });
	}

	const db = new D1Provider(platform.env.DB);
	const currentYear = new Date().getFullYear();
	const cutoffYear = currentYear - 1;
	const curatorHandle = url.searchParams.get('curator');

	// New Artists: recently active, not ended, has at least one tag
	let newArtists: Array<{
		id: number;
		mbid: string;
		name: string;
		slug: string;
		country: string | null;
		begin_year: number | null;
		tags: string | null;
	}> = [];

	try {
		newArtists = await db.all<{
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
			 ORDER BY a.begin_year DESC, a.id DESC
			 LIMIT 30`,
			cutoffYear
		);
	} catch {
		// newArtists stays empty if query fails
	}

	// Gaining Traction: same recency filter, ordered by average tag rarity
	// High AVG(1/artist_count) = tags shared with fewer artists = more niche
	let gainingTraction: Array<{
		id: number;
		mbid: string;
		name: string;
		slug: string;
		country: string | null;
		begin_year: number | null;
		tags: string | null;
	}> = [];

	try {
		gainingTraction = await db.all<{
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
	} catch {
		// gainingTraction stays empty if query fails
	}

	// Curator artists: if ?curator= param is set, return their featured artists
	let curatorArtists: Array<{
		id: number;
		mbid: string;
		name: string;
		slug: string;
		country: string | null;
		begin_year: number | null;
		tags: string | null;
	}> = [];

	if (curatorHandle) {
		try {
			curatorArtists = await db.all<{
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
				 JOIN curator_features cf ON cf.artist_mbid = a.mbid
				 WHERE cf.curator_handle = ?
				 ORDER BY cf.featured_at DESC
				 LIMIT 30`,
				curatorHandle
			);
		} catch {
			// curator_features may not exist on older DB versions — return empty gracefully
		}
	}

	return json({ newArtists, gainingTraction, curatorArtists });
};
