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
