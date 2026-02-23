/**
 * Scene detection algorithm.
 *
 * Turns tag co-occurrence data + listener favorites into typed DetectedScene
 * objects with two-tier anti-rich-get-richer partitioning.
 *
 * This module is Tauri-only — all exported functions guard against web context
 * using isTauri() from '$lib/platform'.
 */

import { isTauri } from '$lib/platform';
import type { DbProvider } from '$lib/db/provider';
import type { DetectedScene, PartitionedScenes, SceneArtist } from './types';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TagPairSeed {
	tag_a: string;
	tag_b: string;
	shared_artists: number;
}

interface TagCluster {
	tags: string[];
}

// ---------------------------------------------------------------------------
// Dynamic Tauri invoke helper
// ---------------------------------------------------------------------------

/** Dynamically import Tauri invoke to avoid web build failures */
async function getInvoke() {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

// ---------------------------------------------------------------------------
// Algorithm steps
// ---------------------------------------------------------------------------

/**
 * Query tag_cooccurrence with niche filters — seeds for cluster building.
 * Only returns pairs where both tags have < 200 artists (niche filter)
 * and at least 5 shared artists (signal filter).
 */
export async function findTagClusterSeeds(db: DbProvider): Promise<TagPairSeed[]> {
	return db.all<TagPairSeed>(
		`SELECT tc.tag_a, tc.tag_b, tc.shared_artists
		 FROM tag_cooccurrence tc
		 JOIN tag_stats ts_a ON ts_a.tag = tc.tag_a
		 JOIN tag_stats ts_b ON ts_b.tag = tc.tag_b
		 WHERE ts_a.artist_count < 200
		   AND ts_b.artist_count < 200
		   AND tc.shared_artists >= 5
		 ORDER BY tc.shared_artists DESC
		 LIMIT 200`
	);
}

/**
 * Group overlapping tag pairs into clusters using iterative merge.
 *
 * Two pairs belong in the same cluster if they share at least one tag.
 * Uses iterative merge: for each seed, check if tag_a or tag_b is already
 * in an existing cluster; if yes, merge into that cluster; if no, create new.
 *
 * Returns up to 50 clusters, sorted by size descending.
 */
export function groupTagPairsIntoClusters(seeds: TagPairSeed[]): TagCluster[] {
	const clusters: Array<{ tags: Set<string> }> = [];

	for (const seed of seeds) {
		// Find all existing clusters that contain either tag
		const matchingIndices: number[] = [];
		for (let i = 0; i < clusters.length; i++) {
			if (clusters[i].tags.has(seed.tag_a) || clusters[i].tags.has(seed.tag_b)) {
				matchingIndices.push(i);
			}
		}

		if (matchingIndices.length === 0) {
			// No match — create new cluster
			clusters.push({ tags: new Set([seed.tag_a, seed.tag_b]) });
		} else {
			// Merge all matching clusters + this seed into the first match
			const primary = clusters[matchingIndices[0]];
			primary.tags.add(seed.tag_a);
			primary.tags.add(seed.tag_b);

			// Merge any additional matching clusters into primary, then remove them
			for (let i = matchingIndices.length - 1; i >= 1; i--) {
				const idx = matchingIndices[i];
				for (const tag of clusters[idx].tags) {
					primary.tags.add(tag);
				}
				clusters.splice(idx, 1);
			}
		}
	}

	// Sort by cluster size descending, cap at 50
	return clusters
		.sort((a, b) => b.tags.size - a.tags.size)
		.slice(0, 50)
		.map((c) => ({ tags: Array.from(c.tags) }));
}

/**
 * Get artists that have ALL tags in the cluster (up to 3 tags).
 * If cluster has more than 3 tags, uses the top 3 by position (niche-first).
 * Returns up to 20 SceneArtist records.
 */
export async function getClusterArtists(
	db: DbProvider,
	tags: string[]
): Promise<SceneArtist[]> {
	const topTags = tags.slice(0, 3);

	if (topTags.length === 1) {
		return db.all<SceneArtist>(
			`SELECT a.mbid, a.name, a.slug, a.country,
			        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags
			 FROM artists a
			 JOIN artist_tags at1 ON at1.artist_id = a.id AND at1.tag = ?
			 ORDER BY at1.count DESC
			 LIMIT 20`,
			topTags[0]
		);
	} else if (topTags.length === 2) {
		return db.all<SceneArtist>(
			`SELECT a.mbid, a.name, a.slug, a.country,
			        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags,
			        at1.count as primary_count
			 FROM artists a
			 JOIN artist_tags at1 ON at1.artist_id = a.id AND at1.tag = ?
			 JOIN artist_tags at2 ON at2.artist_id = a.id AND at2.tag = ?
			 ORDER BY at1.count DESC
			 LIMIT 20`,
			topTags[0],
			topTags[1]
		);
	} else {
		// 3 tags
		return db.all<SceneArtist>(
			`SELECT a.mbid, a.name, a.slug, a.country,
			        (SELECT GROUP_CONCAT(tag, ', ') FROM artist_tags WHERE artist_id = a.id LIMIT 5) AS tags,
			        at1.count as primary_count
			 FROM artists a
			 JOIN artist_tags at1 ON at1.artist_id = a.id AND at1.tag = ?
			 JOIN artist_tags at2 ON at2.artist_id = a.id AND at2.tag = ?
			 JOIN artist_tags at3 ON at3.artist_id = a.id AND at3.tag = ?
			 ORDER BY at1.count DESC
			 LIMIT 20`,
			topTags[0],
			topTags[1],
			topTags[2]
		);
	}
}

/**
 * Returns true if none of the top 3 tags appear in the genres table as mb_tag.
 * A tag combination not in the KB genres table = novel / emerging scene.
 */
export async function isNovelTagCombination(
	tags: string[],
	db: DbProvider
): Promise<boolean> {
	const topTags = tags.slice(0, 3);
	if (topTags.length === 0) return true;

	const placeholders = topTags.map(() => '?').join(', ');
	const result = await db.get<{ cnt: number }>(
		`SELECT COUNT(*) as cnt FROM genres WHERE mb_tag IN (${placeholders})`,
		...topTags
	);

	return (result?.cnt ?? 0) === 0;
}

/**
 * Tauri-only. Gets user's favorite_artists via invoke, returns count of how
 * many appear in the candidate scene's artist MBIDs.
 * If not in Tauri context, returns 0.
 * Minimum viable scene = 2 of the user's favorites appear in scene artists.
 */
export async function validateListenerOverlap(artistMbids: string[]): Promise<number> {
	if (!isTauri()) return 0;

	try {
		const invoke = await getInvoke();
		const favorites = await invoke<Array<{ artist_mbid: string }>>('get_favorite_artists');
		const favSet = new Set(favorites.map((f) => f.artist_mbid));

		return artistMbids.filter((mbid) => favSet.has(mbid)).length;
	} catch {
		return 0;
	}
}

// ---------------------------------------------------------------------------
// Fisher-Yates shuffle
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

// ---------------------------------------------------------------------------
// Main exported functions
// ---------------------------------------------------------------------------

/**
 * Main scene detection entry point. Tauri-only — returns [] immediately on web.
 *
 * Algorithm:
 * 1. Open mercury.db via getProvider()
 * 2. Find tag cluster seeds from tag_cooccurrence
 * 3. Group seeds into clusters
 * 4. For each cluster (first 30): validate artists + listener overlap
 * 5. Cache results to taste.db via save_detected_scenes invoke
 * 6. Return detected scenes
 */
export async function detectScenes(): Promise<DetectedScene[]> {
	if (!isTauri()) return [];

	try {
		const { getProvider } = await import('$lib/db/provider');
		const db = await getProvider();
		const invoke = await getInvoke();

		// Step 1: Find tag cluster seeds
		const seeds = await findTagClusterSeeds(db);
		if (seeds.length === 0) return [];

		// Step 2: Group into clusters
		const clusters = groupTagPairsIntoClusters(seeds);

		// Step 3: Evaluate each cluster (first 30 to limit execution time)
		const results: DetectedScene[] = [];

		for (const cluster of clusters.slice(0, 30)) {
			// Get artists that have all tags in the cluster
			const artists = await getClusterArtists(db, cluster.tags);

			// Must have at least 3 artists to qualify as a scene
			if (artists.length < 3) continue;

			// Check listener overlap (how many of user's favorites are in this scene)
			const listenerCount = await validateListenerOverlap(artists.map((a) => a.mbid));

			// Check if this is a novel tag combination (not in KB genres)
			const emerging = await isNovelTagCombination(cluster.tags, db);

			// Dominant tag is first tag in the cluster (niche-first order from seeds)
			const dominantTag = cluster.tags[0];

			// Build human-readable name: capitalize, replace hyphens with spaces
			const sceneName = dominantTag
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

			results.push({
				slug: dominantTag,
				name: sceneName,
				tags: cluster.tags,
				artistMbids: artists.map((a) => a.mbid),
				listenerCount,
				isEmerging: emerging,
				detectedAt: Math.floor(Date.now() / 1000)
			});
		}

		// Step 4: Cache to taste.db
		if (results.length > 0) {
			await invoke('save_detected_scenes', {
				scenes: results.map((s) => ({
					slug: s.slug,
					name: s.name,
					tags: JSON.stringify(s.tags),
					artist_mbids: JSON.stringify(s.artistMbids),
					listener_count: s.listenerCount,
					is_emerging: s.isEmerging,
					detected_at: s.detectedAt
				}))
			});
		}

		return results;
	} catch (e) {
		console.error('[scene detection] detectScenes failed:', e);
		return [];
	}
}

/**
 * Partition scenes into active and emerging tiers.
 *
 * Anti-rich-get-richer design:
 * - emerging: scenes where isEmerging === true OR listenerCount <= 2
 * - active: scenes where !isEmerging AND listenerCount > 2
 *
 * Both arrays are shuffled with Fisher-Yates to prevent order lock-in.
 */
export function partitionScenes(scenes: DetectedScene[]): PartitionedScenes {
	const active: DetectedScene[] = [];
	const emerging: DetectedScene[] = [];

	for (const scene of scenes) {
		if (scene.isEmerging || scene.listenerCount <= 2) {
			emerging.push(scene);
		} else {
			active.push(scene);
		}
	}

	return {
		active: shuffleArray(active),
		emerging: shuffleArray(emerging)
	};
}

/**
 * Load previously detected scenes from taste.db cache. Tauri-only.
 * Returns [] if not in Tauri or no cached scenes exist.
 *
 * Parses JSON string fields (tags, artist_mbids) that Rust stores as strings.
 */
export async function loadCachedScenes(): Promise<DetectedScene[]> {
	if (!isTauri()) return [];

	try {
		const invoke = await getInvoke();

		const rows = await invoke<Array<{
			slug: string;
			name: string;
			tags: string;
			artist_mbids: string;
			listener_count: number;
			is_emerging: boolean;
			detected_at: number;
		}>>('get_detected_scenes');

		return rows.map((row) => ({
			slug: row.slug,
			name: row.name,
			tags: JSON.parse(row.tags) as string[],
			artistMbids: JSON.parse(row.artist_mbids) as string[],
			listenerCount: row.listener_count,
			isEmerging: row.is_emerging,
			detectedAt: row.detected_at
		}));
	} catch {
		return [];
	}
}
