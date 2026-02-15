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

/** Semantic link category based on MusicBrainz relationship types. */
export type LinkCategory = 'streaming' | 'social' | 'official' | 'info' | 'support' | 'other';

/** A single categorized link with its URL and display label. */
export interface CategorizedLink {
	url: string;
	label: string;
}

/** Artist-level links organized by semantic category. */
export type CategorizedLinks = Record<LinkCategory, CategorizedLink[]>;

/** A streaming link on a release, with its platform type. */
export interface ReleaseLink {
	url: string;
	platform: PlatformType;
}

/** A release group (album/EP/single) with cover art and platform links. */
export interface ReleaseGroup {
	mbid: string;
	title: string;
	year: number | null;
	type: 'Album' | 'EP' | 'Single' | 'Other';
	coverArtUrl: string | null;
	links: ReleaseLink[];
}

/** All link categories for display ordering. */
export const LINK_CATEGORY_ORDER: LinkCategory[] = [
	'official',
	'streaming',
	'social',
	'info',
	'support',
	'other'
];

/** Human-readable labels for link categories. */
export const LINK_CATEGORY_LABELS: Record<LinkCategory, string> = {
	official: 'Official',
	streaming: 'Streaming',
	social: 'Social',
	info: 'Info',
	support: 'Support',
	other: 'Other'
};
