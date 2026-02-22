/**
 * Import/Export index — full data export and Mercury re-import.
 *
 * Export collects all user data from taste.db into a single JSON file.
 * Uses write_json_to_path Rust command for file write.
 * Follows pattern established in src/lib/taste/history.ts.
 */

import type { Collection, CollectionItem } from '$lib/taste/collections.svelte';
import type { TasteTag, TasteAnchor, FavoriteArtist } from '$lib/taste/profile.svelte';
import type { PlayRecord } from '$lib/taste/history';

export interface MercuryDataExport {
	version: number;
	exported_at: string;
	identity: Record<string, string>;
	collections: Collection[];
	collection_items: CollectionItem[];
	taste_tags: TasteTag[];
	taste_anchors: TasteAnchor[];
	favorites: FavoriteArtist[];
	play_history: PlayRecord[];
}

/** Export all user data to a JSON file via Tauri save dialog. */
export async function exportAllUserData(): Promise<void> {
	const { invoke } = await import('@tauri-apps/api/core');

	const [identity, collections, items, tasteTags, anchors, favorites, playHistory] =
		await Promise.all([
			invoke<Record<string, string>>('get_all_identity'),
			invoke<Collection[]>('get_collections'),
			invoke<CollectionItem[]>('get_all_collection_items'),
			invoke<TasteTag[]>('get_taste_tags'),
			invoke<TasteAnchor[]>('get_taste_anchors'),
			invoke<FavoriteArtist[]>('get_favorite_artists'),
			invoke<PlayRecord[]>('get_play_history', { limit: null })
		]);

	const dump: MercuryDataExport = {
		version: 1,
		exported_at: new Date().toISOString(),
		identity,
		collections,
		collection_items: items,
		taste_tags: tasteTags,
		taste_anchors: anchors,
		favorites,
		play_history: playHistory
	};

	const json = JSON.stringify(dump, null, 2);

	try {
		const { save } = await import('@tauri-apps/plugin-dialog');
		const path = await save({
			defaultPath: 'mercury-data-export.json',
			filters: [{ name: 'JSON', extensions: ['json'] }]
		});
		if (path) {
			// Use write_json_to_path — a general-purpose Rust command added in Plan 01 that
			// accepts (path: String, json: String). Do NOT use export_play_history_to_path here:
			// that command's signature is (path: String, state) and does not accept a json param.
			await invoke('write_json_to_path', { path, json });
		}
	} catch {
		// Web fallback: browser download
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'mercury-data-export.json';
		a.click();
		URL.revokeObjectURL(url);
	}
}

/** Re-export utility types for consumers */
export type { SpotifyArtist } from './spotify';
export type { LastFmArtist } from './lastfm';
export type { AppleMusicArtist } from './apple';
