/**
 * Taste module — barrel export for all taste-related functionality.
 *
 * Provides taste profile state, favorites management, taste signal
 * computation, and embedding generation/similarity search.
 */

export {
	type TasteTag,
	type TasteAnchor,
	type FavoriteArtist,
	MINIMUM_TASTE_THRESHOLD,
	tasteProfile,
	loadTasteProfile,
	computeHasEnoughData,
	refreshTasteStatus
} from './profile.svelte';

export {
	addFavorite,
	removeFavorite,
	isFavorite,
	loadFavorites
} from './favorites';

export {
	computeTasteFromLibrary,
	computeTasteFromFavorites,
	recomputeTaste
} from './signals';

export {
	type SimilarArtist,
	generateEmbedding,
	embedArtist,
	findSimilar,
	getOrComputeEmbedding
} from './embeddings';
