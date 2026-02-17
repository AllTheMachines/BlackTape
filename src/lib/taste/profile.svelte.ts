/**
 * Taste Profile — reactive state for the user's musical taste.
 *
 * Stores tags (weighted by source), anchors (pinned artists), and favorites.
 * Loaded from taste.db via Tauri invoke commands.
 * Uses Svelte 5 runes ($state) for global reactivity.
 */

export interface TasteTag {
	tag: string;
	weight: number;
	source: string;
}

export interface TasteAnchor {
	artist_mbid: string;
	artist_name: string;
	pinned_at: number;
}

export interface FavoriteArtist {
	artist_mbid: string;
	artist_name: string;
	artist_slug: string;
	saved_at: number;
}

/**
 * Minimum number of favorite artists required before recommendations are enabled.
 * Alternative: 20+ library tracks also qualifies.
 */
export const MINIMUM_TASTE_THRESHOLD = 5;

export const tasteProfile = $state({
	tags: [] as TasteTag[],
	anchors: [] as TasteAnchor[],
	favorites: [] as FavoriteArtist[],
	isLoaded: false,
	hasEnoughData: false
});

/**
 * Load the full taste profile from taste.db (tags, anchors, favorites).
 */
export async function loadTasteProfile(): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');

		const [tags, anchors, favorites] = await Promise.all([
			invoke<TasteTag[]>('get_taste_tags'),
			invoke<TasteAnchor[]>('get_taste_anchors'),
			invoke<FavoriteArtist[]>('get_favorite_artists')
		]);

		tasteProfile.tags = tags;
		tasteProfile.anchors = anchors;
		tasteProfile.favorites = favorites;
		tasteProfile.isLoaded = true;
		tasteProfile.hasEnoughData = await computeHasEnoughData();
	} catch (e) {
		console.error('Failed to load taste profile:', e);
		tasteProfile.isLoaded = true;
		tasteProfile.hasEnoughData = false;
	}
}

/**
 * Check if the user has enough data for recommendations.
 *
 * Either condition is sufficient:
 * - 5+ favorite artists
 * - 20+ library tracks
 */
export async function computeHasEnoughData(): Promise<boolean> {
	// Check favorites count
	if (tasteProfile.favorites.length >= MINIMUM_TASTE_THRESHOLD) {
		return true;
	}

	// Check library tracks count (dynamic import to avoid circular deps)
	try {
		const { libraryState } = await import('$lib/library/store.svelte');
		if (libraryState.tracks.length >= 20) {
			return true;
		}
	} catch {
		// Library not available (e.g. web build)
	}

	return false;
}

/**
 * Refresh the hasEnoughData flag. Called when favorites or library changes.
 */
export async function refreshTasteStatus(): Promise<void> {
	tasteProfile.hasEnoughData = await computeHasEnoughData();
}
