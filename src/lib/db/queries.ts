/**
 * Database query functions for Mercury search and artist lookup.
 *
 * All queries go through the DbProvider interface — the same functions
 * work with Cloudflare D1 (web) and Tauri SQL plugin (desktop).
 * FTS5 is used for artist name search with a LIKE fallback
 * when the sanitized query would be empty.
 */

import type { DbProvider } from './provider';

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

/** Filter options for crate digging mode */
export interface CrateFilters {
	tag?: string;
	decadeMin?: number;
	decadeMax?: number;
	country?: string;
}

/** Style map node (a tag with its popularity) */
export interface StyleMapNode {
	tag: string;
	artist_count: number;
}

/** Style map edge (co-occurrence between two tags) */
export interface StyleMapEdge {
	tag_a: string;
	tag_b: string;
	shared_artists: number;
}

/** Artist uniqueness data */
export interface UniquenessResult {
	uniqueness_score: number;
	tag_count: number;
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
	db: DbProvider,
	query: string,
	limit: number = DEFAULT_LIMIT
): Promise<ArtistResult[]> {
	const sanitized = sanitizeFtsQuery(query);
	const lowerQuery = query.toLowerCase().trim();

	if (!sanitized) {
		// Fallback: plain LIKE search when FTS query would be empty
		const results = await db.all<ArtistResult>(
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
			 LIMIT ?`,
			`%${query}%`,
			lowerQuery,
			lowerQuery + '%',
			limit
		);

		return results;
	}

	const results = await db.all<ArtistResult>(
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
		 LIMIT ?`,
		sanitized,
		lowerQuery,
		lowerQuery + '%',
		limit
	);

	return results;
}

/**
 * Search for artists that have a specific tag.
 *
 * Results are ordered by the tag's vote count (descending) so the most
 * strongly-tagged artists surface first.
 */
export async function searchByTag(
	db: DbProvider,
	tag: string,
	limit: number = DEFAULT_LIMIT
): Promise<ArtistResult[]> {
	const normalizedTag = tag.toLowerCase().trim();

	const results = await db.all<ArtistResult>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country,
		        GROUP_CONCAT(at_all.tag, ', ') AS tags
		 FROM artist_tags at1
		 JOIN artists a ON a.id = at1.artist_id
		 LEFT JOIN artist_tags at_all ON at_all.artist_id = a.id
		 WHERE at1.tag = ?
		 GROUP BY a.id
		 ORDER BY at1.count DESC
		 LIMIT ?`,
		normalizedTag,
		limit
	);

	return results;
}

/**
 * Look up a single artist by their URL slug.
 *
 * Returns the full Artist record with aggregated tags, or null if the
 * slug does not match any artist.
 */
export async function getArtistBySlug(
	db: DbProvider,
	slug: string
): Promise<Artist | null> {
	return db.get<Artist>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.type, a.country,
		        a.begin_year, a.ended,
		        GROUP_CONCAT(at2.tag, ', ') AS tags
		 FROM artists a
		 LEFT JOIN artist_tags at2 ON at2.artist_id = a.id
		 WHERE a.slug = ?
		 GROUP BY a.id`,
		slug
	);
}

// ---------------------------------------------------------------------------
// Discovery queries
// ---------------------------------------------------------------------------

/**
 * Return the most popular tags by artist count.
 * Used to populate the initial state of the tag browser.
 */
export async function getPopularTags(
	db: DbProvider,
	limit = 100
): Promise<Array<{ tag: string; artist_count: number }>> {
	return db.all(
		`SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT ?`,
		limit
	);
}

/**
 * Return artists that have ALL of the specified tags (AND logic).
 * Results are ordered niche-first (fewest total tags ascending).
 * Caps at 5 tags to stay within D1 bound parameter limits.
 */
export async function getArtistsByTagIntersection(
	db: DbProvider,
	tags: string[],
	limit = 50
): Promise<ArtistResult[]> {
	if (tags.length === 0) return [];
	// Cap at 5 tags to stay within D1 bound parameter limits
	const safeTags = tags.slice(0, 5);

	const joins = safeTags
		.map((_, i) => `JOIN artist_tags at${i} ON at${i}.artist_id = a.id AND at${i}.tag = ?`)
		.join('\n        ');

	return db.all<ArtistResult>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country,
		        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags,
		        (SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id) AS artist_tag_count
		 FROM artists a
		 ${joins}
		 GROUP BY a.id
		 ORDER BY artist_tag_count ASC
		 LIMIT ?`,
		...safeTags,
		limit
	);
}

/**
 * Return artists ranked by a composite discovery score.
 * Score rewards: rare tags, low total tag count, recent origin, and active status.
 */
export async function getDiscoveryRankedArtists(
	db: DbProvider,
	limit = 50
): Promise<ArtistResult[]> {
	return db.all<ArtistResult>(
		`SELECT
		   a.id, a.mbid, a.name, a.slug, a.country,
		   (SELECT GROUP_CONCAT(at2.tag, ', ') FROM artist_tags at2 WHERE at2.artist_id = a.id) AS tags,
		   COALESCE(
		     (
		       1.0 / NULLIF((SELECT COUNT(*) FROM artist_tags WHERE artist_id = a.id), 0)
		       *
		       (SELECT AVG(1.0 / NULLIF(ts.artist_count, 0))
		        FROM artist_tags at3
		        JOIN tag_stats ts ON ts.tag = at3.tag
		        WHERE at3.artist_id = a.id)
		       *
		       CASE WHEN a.begin_year >= 2010 THEN 1.2 ELSE 1.0 END
		       *
		       CASE WHEN a.ended = 0 THEN 1.1 ELSE 1.0 END
		     ),
		     0
		   ) AS discovery_score
		 FROM artists a
		 WHERE a.id IN (SELECT DISTINCT artist_id FROM artist_tags)
		 ORDER BY discovery_score DESC
		 LIMIT ?`,
		limit
	);
}
