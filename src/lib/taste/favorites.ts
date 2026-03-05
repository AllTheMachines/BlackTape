/**
 * Favorites — favorite artist management.
 *
 * Wraps Tauri invoke commands for adding/removing favorite artists.
 * Updates the reactive tasteProfile state and triggers taste recomputation.
 * Uses dynamic imports for Tauri isolation (same pattern as library/scanner.ts).
 */

import { tasteProfile, refreshTasteStatus } from './profile.svelte';
import type { FavoriteArtist, FavoriteRelease } from './profile.svelte';

/** Dynamically import Tauri invoke to avoid web build failures */
async function getInvoke() {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

/**
 * Add an artist to favorites. Persists to taste.db and updates reactive state.
 */
export async function addFavorite(
	mbid: string,
	name: string,
	slug: string
): Promise<void> {
	const invoke = await getInvoke();
	await invoke('add_favorite_artist', {
		artistMbid: mbid,
		artistName: name,
		artistSlug: slug
	});

	// Update local state
	const now = Math.floor(Date.now() / 1000);
	const newFavorite: FavoriteArtist = {
		artist_mbid: mbid,
		artist_name: name,
		artist_slug: slug,
		saved_at: now
	};

	// Remove if already exists (upsert behavior)
	tasteProfile.favorites = [
		newFavorite,
		...tasteProfile.favorites.filter((f) => f.artist_mbid !== mbid)
	];

	// Trigger taste recomputation
	await refreshTasteStatus();
	try {
		const { recomputeTaste } = await import('./signals');
		await recomputeTaste();
	} catch {
		// Signals module not critical for basic operation
	}
}

/**
 * Remove an artist from favorites. Persists to taste.db and updates reactive state.
 */
export async function removeFavorite(mbid: string): Promise<void> {
	const invoke = await getInvoke();
	await invoke('remove_favorite_artist', { artistMbid: mbid });

	// Update local state
	tasteProfile.favorites = tasteProfile.favorites.filter(
		(f) => f.artist_mbid !== mbid
	);

	// Trigger taste recomputation
	await refreshTasteStatus();
	try {
		const { recomputeTaste } = await import('./signals');
		await recomputeTaste();
	} catch {
		// Signals module not critical for basic operation
	}
}

/**
 * Check if an artist is a favorite (local check, no invoke needed after initial load).
 */
export function isFavorite(mbid: string): boolean {
	return tasteProfile.favorites.some((f) => f.artist_mbid === mbid);
}

/**
 * Load all favorites from taste.db into the tasteProfile state.
 */
export async function loadFavorites(): Promise<void> {
	const invoke = await getInvoke();
	const favorites = await invoke<FavoriteArtist[]>('get_favorite_artists');
	tasteProfile.favorites = favorites;
}

/**
 * Add a release to favorites. Persists to taste.db and updates reactive state.
 */
export async function addFavoriteRelease(
	mbid: string,
	releaseName: string,
	artistName: string,
	artistSlug: string
): Promise<void> {
	const invoke = await getInvoke();
	await invoke('add_favorite_release', {
		releaseMbid: mbid,
		releaseName,
		artistName,
		artistSlug
	});

	const now = Math.floor(Date.now() / 1000);
	const newFav: FavoriteRelease = {
		release_mbid: mbid,
		release_name: releaseName,
		artist_name: artistName,
		artist_slug: artistSlug,
		saved_at: now
	};

	tasteProfile.favoriteReleases = [
		newFav,
		...tasteProfile.favoriteReleases.filter((r) => r.release_mbid !== mbid)
	];
}

/**
 * Remove a release from favorites. Persists to taste.db and updates reactive state.
 */
export async function removeFavoriteRelease(mbid: string): Promise<void> {
	const invoke = await getInvoke();
	await invoke('remove_favorite_release', { releaseMbid: mbid });

	tasteProfile.favoriteReleases = tasteProfile.favoriteReleases.filter(
		(r) => r.release_mbid !== mbid
	);
}

/**
 * Check if a release is a favorite (local check, no invoke needed after initial load).
 */
export function isFavoriteRelease(mbid: string): boolean {
	return tasteProfile.favoriteReleases.some((r) => r.release_mbid === mbid);
}

/**
 * Load all release favorites from taste.db into the tasteProfile state.
 */
export async function loadFavoriteReleases(): Promise<void> {
	const invoke = await getInvoke();
	const releases = await invoke<FavoriteRelease[]>('get_favorite_releases');
	tasteProfile.favoriteReleases = releases;
}
