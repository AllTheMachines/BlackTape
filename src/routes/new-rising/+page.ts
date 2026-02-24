import type { PageLoad } from './$types';

type ArtistRow = {
	id: number;
	mbid: string;
	name: string;
	slug: string;
	country: string | null;
	begin_year: number | null;
	tags: string | null;
};

export const load: PageLoad = async ({ url }) => {
	const currentYear = new Date().getFullYear();
	const cutoffYear = currentYear - 1;
	const curatorHandle = url.searchParams.get('curator') ?? null;

	try {
		const { getProvider } = await import('$lib/db/provider');
		const db = await getProvider();

		let newArtists: ArtistRow[] = [];
		try {
			newArtists = await db.all<ArtistRow>(
				`SELECT a.id, a.mbid, a.name, a.slug, a.country, a.begin_year,
				        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
				 FROM artists a
				 WHERE a.begin_year >= ? AND a.ended = 0
				   AND a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
				 ORDER BY a.begin_year DESC, a.id DESC
				 LIMIT 30`,
				cutoffYear
			);
		} catch { /* stays empty */ }

		let gainingTraction: ArtistRow[] = [];
		try {
			gainingTraction = await db.all<ArtistRow>(
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
		} catch { /* tag_stats may not be populated — stays empty */ }

		let curatorArtists: ArtistRow[] = [];
		if (curatorHandle) {
			try {
				curatorArtists = await db.all<ArtistRow>(
					`SELECT a.id, a.mbid, a.name, a.slug, a.country, a.begin_year,
					        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
					 FROM artists a
					 JOIN curator_features cf ON cf.artist_mbid = a.mbid
					 WHERE cf.curator_handle = ?
					 ORDER BY cf.featured_at DESC
					 LIMIT 30`,
					curatorHandle
				);
			} catch { /* curator_features may not exist on older DB versions */ }
		}

		return { newArtists, gainingTraction, curatorArtists, curatorHandle, currentYear };
	} catch {
		return {
			newArtists: [],
			gainingTraction: [],
			curatorArtists: [],
			curatorHandle,
			currentYear
		};
	}
};
