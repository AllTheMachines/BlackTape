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

/** A genre/scene/city node in the genre graph */
export interface GenreNode {
	id: number;
	slug: string;
	name: string;
	type: 'genre' | 'scene' | 'city';
	inception_year: number | null;
	origin_city: string | null;
	origin_lat: number | null;
	origin_lng: number | null;
	wikidata_id: string | null;
	wikipedia_title: string | null;
	mb_tag: string | null;
}

/** A directed relationship edge between two genre nodes */
export interface GenreEdge {
	from_id: number;
	to_id: number;
	rel_type: string;
}

/** A genre subgraph with nodes and edges */
export interface GenreGraph {
	nodes: GenreNode[];
	edges: GenreEdge[];
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

/**
 * Return a random sample of artists for crate digging mode.
 * Uses fast rowid-based random start with a wrap-around fallback
 * when the random position is near the end of the table.
 * Optional filters narrow by tag, decade range, or country.
 */
export async function getCrateDigArtists(
	db: DbProvider,
	filters: CrateFilters = {},
	limit = 20
): Promise<ArtistResult[]> {
	const maxRow = await db.get<{ max_id: number }>(`SELECT MAX(id) as max_id FROM artists`);
	if (!maxRow) return [];

	const randomStart = Math.floor(Math.random() * maxRow.max_id);

	const whereClauses: string[] = [`a.id > ?`];
	const params: unknown[] = [randomStart];

	if (filters.tag) {
		whereClauses.push(`EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)`);
		params.push(filters.tag);
	}
	if (filters.decadeMin !== undefined) {
		whereClauses.push(`a.begin_year >= ?`);
		params.push(filters.decadeMin);
	}
	if (filters.decadeMax !== undefined) {
		whereClauses.push(`a.begin_year < ?`);
		params.push(filters.decadeMax);
	}
	if (filters.country) {
		whereClauses.push(`a.country = ?`);
		params.push(filters.country);
	}
	whereClauses.push(`a.id IN (SELECT DISTINCT artist_id FROM artist_tags)`);

	const where = whereClauses.join(' AND ');
	params.push(limit);

	const results = await db.all<ArtistResult>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country,
		        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
		 FROM artists a
		 WHERE ${where}
		 LIMIT ?`,
		...params
	);

	// Wrap-around fallback: if near end of table, fill remaining from start
	if (results.length < Math.floor(limit / 2)) {
		const fallbackParams: unknown[] = [randomStart];
		const fallbackWhere = [`a.id <= ?`];
		if (filters.tag) {
			fallbackWhere.push(
				`EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)`
			);
			fallbackParams.push(filters.tag);
		}
		if (filters.decadeMin !== undefined) {
			fallbackWhere.push(`a.begin_year >= ?`);
			fallbackParams.push(filters.decadeMin);
		}
		if (filters.decadeMax !== undefined) {
			fallbackWhere.push(`a.begin_year < ?`);
			fallbackParams.push(filters.decadeMax);
		}
		if (filters.country) {
			fallbackWhere.push(`a.country = ?`);
			fallbackParams.push(filters.country);
		}
		fallbackWhere.push(`a.id IN (SELECT DISTINCT artist_id FROM artist_tags)`);
		fallbackParams.push(limit - results.length);

		const fallback = await db.all<ArtistResult>(
			`SELECT a.id, a.mbid, a.name, a.slug, a.country,
			        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id) AS tags
			 FROM artists a
			 WHERE ${fallbackWhere.join(' AND ')}
			 ORDER BY RANDOM()
			 LIMIT ?`,
			...fallbackParams
		);
		return [...results, ...fallback];
	}

	return results;
}

/**
 * Return the uniqueness score and tag count for a single artist by ID.
 * Score = average inverse tag popularity across the artist's tags, scaled to 0–1000.
 * Higher score = rarer combination of tags.
 */
export async function getArtistUniquenessScore(
	db: DbProvider,
	artistId: number
): Promise<UniquenessResult | null> {
	return db.get<UniquenessResult>(
		`SELECT
		   ROUND(
		     COALESCE(
		       (SELECT AVG(1.0 / NULLIF(ts.artist_count, 0)) * 1000.0
		        FROM artist_tags at3
		        JOIN tag_stats ts ON ts.tag = at3.tag
		        WHERE at3.artist_id = ?),
		       0
		     ),
		     2
		   ) AS uniqueness_score,
		   (SELECT COUNT(*) FROM artist_tags WHERE artist_id = ?) AS tag_count`,
		artistId,
		artistId
	);
}

/**
 * Return top-N tags as nodes and their co-occurrence pairs as edges.
 * Used to drive the style map visualization.
 * Edges are filtered to only include connections between the top-N tags.
 */
export async function getStyleMapData(
	db: DbProvider,
	tagLimit = 50
): Promise<{ nodes: StyleMapNode[]; edges: StyleMapEdge[] }> {
	const nodes = await db.all<StyleMapNode>(
		`SELECT tag, artist_count FROM tag_stats ORDER BY artist_count DESC LIMIT ?`,
		tagLimit
	);

	if (nodes.length === 0) return { nodes: [], edges: [] };

	// Fetch edges between the top-N tags only (stay within D1 limits)
	// Use a subquery to filter — avoids sending all tags as bound params
	const edges = await db.all<StyleMapEdge>(
		`SELECT tc.tag_a, tc.tag_b, tc.shared_artists
		 FROM tag_cooccurrence tc
		 WHERE tc.tag_a IN (SELECT tag FROM tag_stats ORDER BY artist_count DESC LIMIT ?)
		   AND tc.tag_b IN (SELECT tag FROM tag_stats ORDER BY artist_count DESC LIMIT ?)
		 ORDER BY tc.shared_artists DESC`,
		tagLimit,
		tagLimit
	);

	return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Genre graph queries (Phase 7 — Knowledge Base)
// ---------------------------------------------------------------------------

/**
 * Load a subgraph centered on a genre slug (genre + up to 30 neighbors).
 * Used by: KB landing page, GenreGraph component expansion.
 */
export async function getGenreSubgraph(
	db: DbProvider,
	genreSlug: string
): Promise<GenreGraph> {
	const center = await db.get<GenreNode>(
		`SELECT id, slug, name, type, inception_year, origin_city, origin_lat, origin_lng,
		        wikidata_id, wikipedia_title, mb_tag
		 FROM genres WHERE slug = ?`,
		genreSlug
	);
	if (!center) return { nodes: [], edges: [] };

	const neighbors = await db.all<GenreNode>(
		`SELECT DISTINCT g.id, g.slug, g.name, g.type, g.inception_year,
		        g.origin_city, g.origin_lat, g.origin_lng, g.wikidata_id, g.wikipedia_title, g.mb_tag
		 FROM genre_relationships gr
		 JOIN genres g ON g.id = gr.from_id OR g.id = gr.to_id
		 WHERE (gr.from_id = ? OR gr.to_id = ?) AND g.id != ?
		 LIMIT 30`,
		center.id,
		center.id,
		center.id
	);

	const edges = await db.all<GenreEdge>(
		`SELECT from_id, to_id, rel_type FROM genre_relationships
		 WHERE from_id = ? OR to_id = ?`,
		center.id,
		center.id
	);

	return { nodes: [center, ...neighbors], edges };
}

/**
 * Get a single genre by slug — full data for genre page.
 * Used by: /kb/genre/[slug] server load.
 */
export async function getGenreBySlug(
	db: DbProvider,
	slug: string
): Promise<GenreNode | null> {
	return db.get<GenreNode>(
		`SELECT id, slug, name, type, inception_year, origin_city, origin_lat, origin_lng,
		        wikidata_id, wikipedia_title, mb_tag
		 FROM genres WHERE slug = ?`,
		slug
	);
}

/**
 * Get key artists for a genre via mb_tag → artist_tags bridge.
 * Returns top N artists by tag vote count.
 * Used by: genre page key artists section.
 */
export async function getGenreKeyArtists(
	db: DbProvider,
	mbTag: string,
	limit = 10
): Promise<ArtistResult[]> {
	return db.all<ArtistResult>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country,
		        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
		 FROM artists a
		 JOIN artist_tags at2 ON at2.artist_id = a.id
		 WHERE at2.tag = ?
		 ORDER BY at2.count DESC
		 LIMIT ?`,
		mbTag,
		limit
	);
}

/**
 * Get artists active in a given year, optionally filtered by tag.
 * Used by: Time Machine page.
 */
export async function getArtistsByYear(
	db: DbProvider,
	year: number,
	tag?: string,
	limit = 50
): Promise<ArtistResult[]> {
	if (tag) {
		return db.all<ArtistResult>(
			`SELECT a.id, a.mbid, a.name, a.slug, a.country,
			        (SELECT GROUP_CONCAT(t.tag, ', ') FROM artist_tags t WHERE t.artist_id = a.id LIMIT 5) AS tags
			 FROM artists a
			 WHERE a.begin_year = ?
			   AND EXISTS (SELECT 1 FROM artist_tags WHERE artist_id = a.id AND tag = ?)
			 ORDER BY a.name
			 LIMIT ?`,
			year,
			tag,
			limit
		);
	}
	return db.all<ArtistResult>(
		`SELECT a.id, a.mbid, a.name, a.slug, a.country,
		        (SELECT GROUP_CONCAT(t.tag, ', ') FROM artist_tags t WHERE t.artist_id = a.id LIMIT 5) AS tags
		 FROM artists a
		 WHERE a.begin_year = ?
		 ORDER BY a.name
		 LIMIT ?`,
		year,
		limit
	);
}

/**
 * Get a starter set of genre nodes for the KB landing graph.
 * Prefers genres whose mb_tag matches the given taste tags (max 5).
 * Falls back to most-connected genres if no taste tags provided or matched.
 * Used by: KB landing page initial graph load.
 */
export async function getStarterGenreGraph(
	db: DbProvider,
	tasteTags: string[] = []
): Promise<GenreGraph> {
	let centerIds: number[] = [];

	if (tasteTags.length > 0) {
		// Find genres matching user taste (up to 5 tags — D1 param limit already handled by caller)
		const placeholders = tasteTags.slice(0, 5).map(() => '?').join(', ');
		const matched = await db.all<{ id: number }>(
			`SELECT DISTINCT g.id FROM genres g
			 WHERE g.mb_tag IN (${placeholders})
			 LIMIT 10`,
			...tasteTags.slice(0, 5)
		);
		centerIds = matched.map((r) => r.id);
	}

	// If no taste match, fall back to top genres by relationship count
	if (centerIds.length === 0) {
		const top = await db.all<{ id: number }>(
			`SELECT from_id as id, COUNT(*) as cnt
			 FROM genre_relationships
			 GROUP BY from_id
			 ORDER BY cnt DESC
			 LIMIT 10`
		);
		centerIds = top.map((r) => r.id);
	}

	if (centerIds.length === 0) return { nodes: [], edges: [] };

	// Load the center genres + their immediate neighbors (LIMIT 50 total nodes)
	const placeholders = centerIds.map(() => '?').join(', ');
	const nodes = await db.all<GenreNode>(
		`SELECT DISTINCT g.id, g.slug, g.name, g.type, g.inception_year,
		        g.origin_city, g.origin_lat, g.origin_lng, g.wikidata_id, g.wikipedia_title, g.mb_tag
		 FROM genres g
		 WHERE g.id IN (${placeholders})
		    OR g.id IN (
		      SELECT CASE WHEN gr.from_id IN (${placeholders}) THEN gr.to_id ELSE gr.from_id END
		      FROM genre_relationships gr
		      WHERE gr.from_id IN (${placeholders}) OR gr.to_id IN (${placeholders})
		    )
		 LIMIT 50`,
		...centerIds,
		...centerIds,
		...centerIds,
		...centerIds
	);

	if (nodes.length === 0) return { nodes: [], edges: [] };
	const nodeIds = nodes.map((n) => n.id);
	const edgePlaceholders = nodeIds.map(() => '?').join(', ');

	const edges = await db.all<GenreEdge>(
		`SELECT from_id, to_id, rel_type FROM genre_relationships
		 WHERE from_id IN (${edgePlaceholders}) AND to_id IN (${edgePlaceholders})`,
		...nodeIds,
		...nodeIds
	);

	return { nodes, edges };
}

/**
 * Get ALL genres and ALL edges — used by Time Machine GenreGraphEvolution view.
 * Loads the full graph so the client can filter client-side by inception_year.
 * No taste filter — every genre is included so the evolution animation is complete.
 * Used by: GenreGraphEvolution.svelte (Tauri path), /api/genres (web path).
 */
export async function getAllGenreGraph(db: DbProvider): Promise<GenreGraph> {
	const nodes = await db.all<GenreNode>(
		`SELECT id, slug, name, type, inception_year,
		        origin_city, origin_lat, origin_lng, wikidata_id, wikipedia_title, mb_tag
		 FROM genres
		 ORDER BY inception_year ASC NULLS LAST`
	);

	if (nodes.length === 0) return { nodes: [], edges: [] };

	const edges = await db.all<GenreEdge>(
		`SELECT from_id, to_id, rel_type FROM genre_relationships`
	);

	return { nodes, edges };
}
