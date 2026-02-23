import type { PageServerLoad } from './$types';
import { D1Provider } from '$lib/db/d1-provider';

/**
 * Server load for /new-rising — web-first (D1 query).
 *
 * On Tauri, this file is not executed (ssr=false). The page shows an empty
 * state directing Tauri users to the web version, or simply renders with
 * empty arrays (the API endpoint /api/new-rising could be used in a +page.ts
 * universal load if needed in future).
 */
export const load: PageServerLoad = async ({ platform, url }) => {
	const currentYear = new Date().getFullYear();
	const cutoffYear = currentYear - 1;
	const curatorHandle = url.searchParams.get('curator') ?? null;

	if (!platform?.env?.DB) {
		return {
			newArtists: [],
			gainingTraction: [],
			curatorArtists: [],
			curatorHandle,
			currentYear
		};
	}

	const db = new D1Provider(platform.env.DB);

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

	// Gaining Traction: niche signal via average tag rarity, same recency filter
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

	// Curator artists: optional — only queried when ?curator= param is present
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
			// curator_features may not exist on older DB versions
		}
	}

	return {
		newArtists,
		gainingTraction,
		curatorArtists,
		curatorHandle,
		currentYear
	};
};
