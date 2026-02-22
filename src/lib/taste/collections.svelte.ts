/**
 * Collections (Shelves) — reactive state for user-defined named collections.
 *
 * Collections contain artists AND releases (not tracks).
 * Loaded from taste.db via Tauri invoke commands.
 * Follows same pattern as tasteProfile in profile.svelte.ts.
 */

export interface Collection {
	id: string;
	name: string;
	created_at: number;
	updated_at: number;
}

export interface CollectionItem {
	id: number;
	collection_id: string;
	item_type: 'artist' | 'release';
	item_mbid: string;
	item_name: string;
	item_slug: string | null;
	added_at: number;
}

export const collectionsState = $state({
	collections: [] as Collection[],
	isLoaded: false
});

export async function loadCollections(): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const collections = await invoke<Collection[]>('get_collections');
		collectionsState.collections = collections;
		collectionsState.isLoaded = true;
	} catch {
		collectionsState.isLoaded = true;
	}
}

export async function createCollection(name: string): Promise<string | null> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const id = await invoke<string>('create_collection', { name });
		await loadCollections(); // refresh list
		return id;
	} catch {
		return null;
	}
}

export async function deleteCollection(id: string): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('delete_collection', { id });
		await loadCollections();
	} catch {}
}

export async function renameCollection(id: string, name: string): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('rename_collection', { id, name });
		await loadCollections();
	} catch {}
}

export async function getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<CollectionItem[]>('get_collection_items', { collectionId });
	} catch {
		return [];
	}
}

export async function addToCollection(
	collectionId: string,
	itemType: 'artist' | 'release',
	itemMbid: string,
	itemName: string,
	itemSlug?: string
): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('add_collection_item', {
			collectionId,
			itemType,
			itemMbid,
			itemName,
			itemSlug: itemSlug ?? null
		});
	} catch {}
}

export async function removeFromCollection(
	collectionId: string,
	itemType: 'artist' | 'release',
	itemMbid: string
): Promise<void> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('remove_collection_item', { collectionId, itemType, itemMbid });
	} catch {}
}

/** Returns list of collection IDs that contain this item. Empty array if none or on web. */
export async function isInAnyCollection(
	itemType: 'artist' | 'release',
	itemMbid: string
): Promise<string[]> {
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		return await invoke<string[]>('is_in_collection', { itemType, itemMbid });
	} catch {
		return [];
	}
}
