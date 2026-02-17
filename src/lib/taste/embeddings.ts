/**
 * Embeddings — frontend wrappers for vector embedding operations.
 *
 * Generates embeddings via the active AI provider and stores/queries them
 * in taste.db via sqlite-vec for nearest-neighbor similarity search.
 * All functions gracefully handle AI not being ready (return null/empty).
 */

import { getAiProvider } from '$lib/ai/engine';

export interface SimilarArtist {
	artist_mbid: string;
	artist_name: string;
	distance: number;
}

/** Dynamically import Tauri invoke to avoid web build failures */
async function getInvoke() {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

/**
 * Generate an embedding vector for a text string.
 * Returns null if AI provider is not ready.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
	const provider = getAiProvider();
	if (!provider) return null;

	try {
		const ready = await provider.isReady();
		if (!ready) return null;

		const embeddings = await provider.embed([text]);
		if (embeddings.length > 0) {
			return embeddings[0];
		}
	} catch (e) {
		console.error('Failed to generate embedding:', e);
	}

	return null;
}

/**
 * Build a text representation of an artist for embedding.
 * Combines name, tags, and country into a descriptive string.
 */
function buildArtistText(
	name: string,
	tags: string[],
	country?: string
): string {
	const parts = [name];

	if (tags.length > 0) {
		parts.push(`genres: ${tags.join(', ')}`);
	}

	if (country) {
		parts.push(`country: ${country}`);
	}

	return parts.join('. ');
}

/**
 * Generate and store an embedding for an artist.
 * Returns the embedding vector, or null if AI is not ready.
 */
export async function embedArtist(
	mbid: string,
	name: string,
	tags: string[],
	country?: string
): Promise<number[] | null> {
	const text = buildArtistText(name, tags, country);
	const embedding = await generateEmbedding(text);

	if (!embedding) return null;

	try {
		const invoke = await getInvoke();
		await invoke('store_embedding', {
			artistMbid: mbid,
			artistName: name,
			embedding
		});
	} catch (e) {
		console.error('Failed to store embedding:', e);
	}

	return embedding;
}

/**
 * Find artists similar to a given embedding vector.
 */
export async function findSimilar(
	embedding: number[],
	limit: number = 10
): Promise<SimilarArtist[]> {
	try {
		const invoke = await getInvoke();
		return await invoke<SimilarArtist[]>('find_similar_artists', {
			embedding,
			limit
		});
	} catch (e) {
		console.error('Failed to find similar artists:', e);
		return [];
	}
}

/**
 * Get or compute an embedding for an artist.
 * Checks if an embedding already exists; if so, returns it.
 * If not, generates one and stores it.
 * Returns null if AI is not ready and no cached embedding exists.
 */
export async function getOrComputeEmbedding(
	mbid: string,
	name: string,
	tags: string[],
	country?: string
): Promise<number[] | null> {
	try {
		const invoke = await getInvoke();

		// Check if we already have an embedding
		const exists = await invoke<boolean>('has_embedding', { artistMbid: mbid });
		if (exists) {
			const cached = await invoke<number[] | null>('get_embedding', {
				artistMbid: mbid
			});
			if (cached) return cached;
		}

		// Generate and store a new embedding
		return await embedArtist(mbid, name, tags, country);
	} catch (e) {
		console.error('Failed to get/compute embedding:', e);
		return null;
	}
}
