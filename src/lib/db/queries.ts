/**
 * Database query functions for Mercury search and artist lookup.
 *
 * All queries target Cloudflare D1 (SQLite under the hood).
 * FTS5 is used for artist name search with a LIKE fallback
 * when the sanitized query would be empty.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Compact result returned by search queries (listing context). */
export interface ArtistResult {
	id: number;
	mbid: string;
	name: string;
	slug: string;
	country: string | null;
	tags: string | null;
}

/** Full artist record returned by single-artist lookup. */
export interface Artist {
	id: number;
	mbid: string;
	name: string;
	slug: string;
	type: string | null;
	country: string | null;
	begin_year: number | null;
	ended: number;
	tags: string | null;
}

// ---------------------------------------------------------------------------
// FTS5 helpers
// ---------------------------------------------------------------------------

/**
 * Strip characters that are special to FTS5 query syntax so user input
 * can be passed straight into a MATCH expression without risk of parse errors.
 *
 * Also removes boolean keywords (AND / OR / NOT / NEAR) that FTS5 interprets
 * as operators when they appear as standalone tokens.
 */
export function sanitizeFtsQuery(input: string): string {
	return input
		.replace(/['"(){}[\]*:^~]/g, '')
		.replace(/\b(AND|OR|NOT|NEAR)\b/gi, '')
		.trim();
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 50;

/**
 * Search artists by name using FTS5 full-text search.
 *
 * If the sanitized query is empty (e.g. the user typed only special chars)
 * we fall back to a simple LIKE query against the artists table so the
 * caller always gets a best-effort result.
 */
export async function searchArtists(
	db: D1Database,
	query: string,
	limit: number = DEFAULT_LIMIT
): Promise<ArtistResult[]> {
	const sanitized = sanitizeFtsQuery(query);
	const lowerQuery = query.toLowerCase().trim();

	if (!sanitized) {
		// Fallback: plain LIKE search when FTS query would be empty
		const { results } = await db
			.prepare(
				`SELECT a.id, a.mbid, a.name, a.slug, a.country,
				        GROUP_CONCAT(at2.tag, ', ') AS tags
				 FROM artists a
				 LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
				 WHERE a.name LIKE ?
				 GROUP BY a.id
				 ORDER BY
				   CASE
				     WHEN LOWER(a.name) = ? THEN 0
				     WHEN LOWER(a.name) LIKE ? THEN 1
				     ELSE 2
				   END,
				   a.name
				 LIMIT ?`
			)
			.bind(`%${query}%`, lowerQuery, lowerQuery + '%', limit)
			.all<ArtistResult>();

		return results;
	}

	const { results } = await db
		.prepare(
			`SELECT a.id, a.mbid, a.name, a.slug, a.country,
			        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
			 FROM artists_fts f
			 JOIN artists a ON a.id = f.rowid
			 WHERE artists_fts MATCH ?
			 ORDER BY
			   CASE
			     WHEN LOWER(a.name) = ? THEN 0
			     WHEN LOWER(a.name) LIKE ? THEN 1
			     ELSE 2
			   END,
			   f.rank
			 LIMIT ?`
		)
		.bind(sanitized, lowerQuery, lowerQuery + '%', limit)
		.all<ArtistResult>();

	return results;
}

/**
 * Search for artists that have a specific tag.
 *
 * Results are ordered by the tag's vote count (descending) so the most
 * strongly-tagged artists surface first.
 */
export async function searchByTag(
	db: D1Database,
	tag: string,
	limit: number = DEFAULT_LIMIT
): Promise<ArtistResult[]> {
	const normalizedTag = tag.toLowerCase().trim();

	const { results } = await db
		.prepare(
			`SELECT a.id, a.mbid, a.name, a.slug, a.country,
			        GROUP_CONCAT(at_all.tag, ', ') AS tags
			 FROM artist_tags at1
			 JOIN artists a ON a.id = at1.artist_id
			 LEFT JOIN artist_tags at_all ON at_all.artist_id = a.id
			 WHERE at1.tag = ?
			 GROUP BY a.id
			 ORDER BY at1.count DESC
			 LIMIT ?`
		)
		.bind(normalizedTag, limit)
		.all<ArtistResult>();

	return results;
}

/**
 * Look up a single artist by their URL slug.
 *
 * Returns the full Artist record with aggregated tags, or null if the
 * slug does not match any artist.
 */
export async function getArtistBySlug(
	db: D1Database,
	slug: string
): Promise<Artist | null> {
	const { results } = await db
		.prepare(
			`SELECT a.id, a.mbid, a.name, a.slug, a.type, a.country,
			        a.begin_year, a.ended,
			        GROUP_CONCAT(at2.tag, ', ') AS tags
			 FROM artists a
			 LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
			 WHERE a.slug = ?
			 GROUP BY a.id`
		)
		.bind(slug)
		.all<Artist>();

	return results[0] ?? null;
}
