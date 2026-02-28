/**
 * Load function for the release detail page — Tauri desktop only.
 * Navigation is instant; MusicBrainz data is fetched in the component's onMount.
 */

import type { PageLoad } from './$types';

export interface Track {
	position: number;
	number: string;
	title: string;
	/** Duration in milliseconds, or null if unknown. */
	length: number | null;
}

export interface Credit {
	name: string;
	role: string;
}

/** A release credit with role/name/mbid and optional local artist slug. */
export type CreditEntry = { role: string; name: string; mbid: string; slug: string | null };

export interface ReleaseDetail {
	releaseGroupMbid: string;
	title: string;
	year: number | null;
	type: string;
	coverArtUrl: string;
	artistName: string;
	artistSlug: string;
	tracks: Track[];
	credits: Credit[];
	buyLinks: import('$lib/affiliates/types').BuyLink[];
}

export const load: PageLoad = async ({ params }) => {
	// Navigation is instant — release data is fetched async in the component's onMount.
	return { mbid: params.mbid, slug: params.slug };
};
