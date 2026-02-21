/**
 * Taste Signals — computes taste tag weights from library and favorites.
 *
 * Reads library tracks and favorite artists, looks up their tags from
 * mercury.db, and builds a weighted tag profile stored in taste.db.
 *
 * This is best-effort: not every library artist will match the mercury.db index.
 */

import { tasteProfile } from './profile.svelte';
import type { TasteTag } from './profile.svelte';

/** Dynamically import Tauri invoke to avoid web build failures */
async function getInvoke() {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

/**
 * Look up tags for an artist from mercury.db via the search provider.
 * Returns an array of tag strings, or empty if artist not found.
 */
async function lookupArtistTags(artistName: string): Promise<string[]> {
	try {
		// Use TauriProvider to search mercury.db for the artist
		const { getProvider } = await import('$lib/db/provider');
		const provider = await getProvider();
		if (!provider) return [];

		// Search for exact match by name
		const results = await provider.all<{ tags: string }>(
			`SELECT tags FROM artists WHERE name = ? COLLATE NOCASE LIMIT 1`,
			[artistName]
		);

		if (results.length > 0 && results[0].tags) {
			return results[0].tags
				.split(',')
				.map((t: string) => t.trim().toLowerCase())
				.filter((t: string) => t.length > 0);
		}
	} catch {
		// mercury.db may not be available
	}

	return [];
}

/**
 * Compute taste tags from the user's local music library.
 *
 * Extracts unique artists from library tracks, looks up their tags in
 * mercury.db, and builds a weighted tag frequency map.
 */
export async function computeTasteFromLibrary(): Promise<Map<string, number>> {
	const tagWeights = new Map<string, number>();

	try {
		const { libraryState } = await import('$lib/library/store.svelte');
		const tracks = libraryState.tracks;

		// Get unique artists from library
		const uniqueArtists = new Set<string>();
		for (const track of tracks) {
			const artist = track.album_artist || track.artist;
			if (artist) {
				uniqueArtists.add(artist);
			}
		}

		// Look up tags for each artist
		for (const artistName of uniqueArtists) {
			const tags = await lookupArtistTags(artistName);
			for (const tag of tags) {
				tagWeights.set(tag, (tagWeights.get(tag) || 0) + 1);
			}
		}
	} catch {
		// Library not available
	}

	return tagWeights;
}

/**
 * Compute taste tags from the user's favorite artists.
 *
 * Favorites are weighted 2x compared to library artists to reflect
 * explicit user preference.
 */
export async function computeTasteFromFavorites(): Promise<Map<string, number>> {
	const tagWeights = new Map<string, number>();

	for (const favorite of tasteProfile.favorites) {
		const tags = await lookupArtistTags(favorite.artist_name);
		for (const tag of tags) {
			// Favorites weighted 2x vs library
			tagWeights.set(tag, (tagWeights.get(tag) || 0) + 2);
		}
	}

	return tagWeights;
}

/**
 * Compute taste tags from play history with time-decay weighting.
 *
 * Recent plays weigh more than older plays (30-day half-life exponential decay).
 * Plays grouped by unique artist before tag lookup — O(unique artists) DB queries, not O(plays).
 * Returns empty map if below activation threshold (5 qualifying plays).
 */
export async function computeTasteFromPlayHistory(): Promise<Map<string, number>> {
	const tagWeights = new Map<string, number>();

	try {
		const invoke = await getInvoke();

		// Activation gate: below 5 plays, play history does not influence taste
		const playCount = await invoke<number>('get_play_count');
		if (playCount < 5) return tagWeights;

		// Fetch all history (no limit — decay handles old plays gracefully)
		const history = await invoke<Array<{
			id: number;
			track_path: string;
			artist_name: string | null;
			played_at: number;
			duration_secs: number;
		}>>('get_play_history', { limit: null });

		const HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

		function decayWeight(playedAtSeconds: number): number {
			const ageMs = Date.now() - playedAtSeconds * 1000;
			// Exponential decay: weight = e^(-ln(2) * age / halfLife)
			// Gives exactly 0.5 weight at half-life
			return Math.exp((-0.693 * ageMs) / HALF_LIFE_MS);
		}

		// Group by artist name to avoid N tag lookups for N plays of same artist
		const artistAccum = new Map<string, number>();
		for (const play of history) {
			if (!play.artist_name) continue;
			const weight = decayWeight(play.played_at);
			artistAccum.set(
				play.artist_name,
				(artistAccum.get(play.artist_name) || 0) + weight
			);
		}

		// Look up tags for each unique artist
		for (const [artistName, totalWeight] of artistAccum) {
			const tags = await lookupArtistTags(artistName);
			for (const tag of tags) {
				tagWeights.set(tag, (tagWeights.get(tag) || 0) + totalWeight);
			}
		}
	} catch {
		// Not in Tauri or play_history not yet available
	}

	return tagWeights;
}

/**
 * Normalize a tag weight map to 0.0-1.0 range.
 */
function normalizeWeights(weights: Map<string, number>): Map<string, number> {
	const maxWeight = Math.max(...weights.values(), 1);
	const normalized = new Map<string, number>();

	for (const [tag, weight] of weights) {
		normalized.set(tag, weight / maxWeight);
	}

	return normalized;
}

/**
 * Recompute the full taste profile from library and favorites.
 *
 * Clears existing computed tags (source='library' or 'favorite'),
 * preserves manually set tags (source='manual').
 * Stores results to taste.db and updates the reactive tasteProfile.tags.
 */
export async function recomputeTaste(): Promise<void> {
	try {
		const invoke = await getInvoke();

		// Clear computed tags (preserve manual)
		const currentTags = await invoke<TasteTag[]>('get_taste_tags');
		for (const tag of currentTags) {
			if (tag.source === 'library' || tag.source === 'favorite' || tag.source === 'playback') {
				await invoke('remove_taste_tag', { tag: tag.tag });
			}
		}

		// Compute from all sources
		const libraryWeights = await computeTasteFromLibrary();
		const favoriteWeights = await computeTasteFromFavorites();
		const playWeights = await computeTasteFromPlayHistory();

		// Merge weights
		const merged = new Map<string, { weight: number; source: string }>();

		for (const [tag, weight] of libraryWeights) {
			merged.set(tag, { weight, source: 'library' });
		}

		for (const [tag, weight] of favoriteWeights) {
			const existing = merged.get(tag);
			if (existing) {
				// Combine weights, mark source as both
				merged.set(tag, {
					weight: existing.weight + weight,
					source: 'favorite'
				});
			} else {
				merged.set(tag, { weight, source: 'favorite' });
			}
		}

		for (const [tag, weight] of playWeights) {
			const existing = merged.get(tag);
			if (existing) {
				merged.set(tag, {
					weight: existing.weight + weight,
					source: existing.source  // existing source wins (library/favorite > playback)
				});
			} else {
				merged.set(tag, { weight, source: 'playback' });
			}
		}

		// Normalize and store
		const allWeights = new Map(
			[...merged].map(([tag, { weight }]) => [tag, weight])
		);
		const normalized = normalizeWeights(allWeights);

		for (const [tag, normWeight] of normalized) {
			const source = merged.get(tag)?.source || 'library';
			await invoke('set_taste_tag', {
				tag,
				weight: normWeight,
				source
			});
		}

		// Reload tags into reactive state
		const updatedTags = await invoke<TasteTag[]>('get_taste_tags');
		tasteProfile.tags = updatedTags;
	} catch (e) {
		console.error('Failed to recompute taste:', e);
	}
}
