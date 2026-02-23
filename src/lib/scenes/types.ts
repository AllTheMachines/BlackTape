/**
 * Type definitions for the scene detection module.
 *
 * Scenes are clusters of niche-tag-sharing artists that form identifiable
 * micro-scenes in the listener's taste graph. The two-tier partition
 * separates established scenes (active) from novel combinations (emerging).
 */

export interface DetectedScene {
	slug: string; // dominant tag as URL slug
	name: string; // dominant tag, human-readable (capitalize, replace hyphens with spaces)
	tags: string[]; // all tags in the cluster, niche-first
	artistMbids: string[]; // MBIDs of artists in the scene (up to 20)
	listenerCount: number; // count of user's own favorites in this scene
	isEmerging: boolean; // true = novel tag combo not in known KB genres
	detectedAt: number; // unix timestamp
}

export interface SceneArtist {
	mbid: string;
	name: string;
	slug: string;
	country: string | null;
	tags: string | null;
	isSuggested?: boolean; // true if community-suggested, not AI-detected
}

export interface SceneSuggestion {
	artistMbid: string;
	artistName: string;
	suggestedAt: number;
}

export interface PartitionedScenes {
	active: DetectedScene[]; // established scenes (listenerCount > 2, not emerging)
	emerging: DetectedScene[]; // novel scenes (isEmerging OR listenerCount <= 2)
}
