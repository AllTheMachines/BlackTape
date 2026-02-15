/**
 * Platform link types and embed data structures.
 *
 * Used by the MusicBrainz API proxy and artist page to categorize
 * external links and generate embed URLs.
 */

/** Supported music platform types for embed/link handling. */
export type PlatformType = 'bandcamp' | 'spotify' | 'soundcloud' | 'youtube';

/** Categorized external links for an artist, sourced from MusicBrainz. */
export interface PlatformLinks {
	bandcamp: string[];
	spotify: string[];
	soundcloud: string[];
	youtube: string[];
	wikipedia: string[];
	other: string[];
}

/** Resolved embed data for a single platform link. */
export interface EmbedData {
	platform: PlatformType;
	url: string;
	embedUrl: string | null;
	embedHtml?: string;
}

/**
 * Platform priority order for embed rendering.
 * Bandcamp first — reflects Mercury's independent music values.
 */
export const PLATFORM_PRIORITY: PlatformType[] = ['bandcamp', 'spotify', 'soundcloud', 'youtube'];
