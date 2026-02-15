/**
 * Shared URL and MusicBrainz relation categorization.
 *
 * Categorizes links by MusicBrainz relationship type into semantic groups,
 * with domain-based fallback. Used by both the artist links and releases APIs.
 */

import type { LinkCategory, PlatformType, CategorizedLink } from './types';

/**
 * Map MusicBrainz relationship type strings to semantic link categories.
 */
const MB_TYPE_TO_CATEGORY: Record<string, LinkCategory> = {
	// Streaming
	'streaming': 'streaming',
	'free streaming': 'streaming',
	'purchase for download': 'streaming',
	'download for free': 'streaming',
	'purchase for mail-order': 'streaming',

	// Social
	'social network': 'social',

	// Official
	'official homepage': 'official',
	'blog': 'official',

	// Info
	'wikipedia': 'info',
	'wikidata': 'info',
	'discography entry': 'info',
	'other databases': 'info',
	'allmusic': 'info',
	'last.fm': 'info',
	'BBC Music page': 'info',
	'VIAF': 'info',
	'IMDb': 'info',
	'setlistfm': 'info',

	// Support
	'crowdfunding': 'support',
	'patronage': 'support',
};

/**
 * Categorize a link using its MusicBrainz relationship type.
 * Falls back to 'other' for unknown types.
 */
export function categorizeByRelationType(mbType: string): LinkCategory {
	return MB_TYPE_TO_CATEGORY[mbType] ?? 'other';
}

/**
 * Domain-to-platform mapping for streaming link detection on releases.
 */
export function detectPlatform(url: string): PlatformType | null {
	try {
		const hostname = new URL(url).hostname;
		if (hostname.includes('bandcamp.com')) return 'bandcamp';
		if (hostname.includes('open.spotify.com') || hostname === 'spotify.com') return 'spotify';
		if (hostname.includes('soundcloud.com')) return 'soundcloud';
		if (hostname.includes('youtube.com') || hostname === 'youtu.be') return 'youtube';
		return null;
	} catch {
		return null;
	}
}

/**
 * Extract a clean display label from a URL.
 * Strips protocol, www prefix, and trailing slashes.
 */
export function labelFromUrl(url: string): string {
	try {
		const u = new URL(url);
		let host = u.hostname.replace(/^www\./, '');

		// For known platforms, use friendly names
		const FRIENDLY_NAMES: Record<string, string> = {
			'open.spotify.com': 'Spotify',
			'spotify.com': 'Spotify',
			'soundcloud.com': 'SoundCloud',
			'youtube.com': 'YouTube',
			'youtu.be': 'YouTube',
			'music.youtube.com': 'YouTube Music',
			'music.apple.com': 'Apple Music',
			'itunes.apple.com': 'Apple Music',
			'tidal.com': 'Tidal',
			'deezer.com': 'Deezer',
			'twitter.com': 'Twitter',
			'x.com': 'X (Twitter)',
			'instagram.com': 'Instagram',
			'facebook.com': 'Facebook',
			'mastodon.social': 'Mastodon',
			'en.wikipedia.org': 'Wikipedia',
			'discogs.com': 'Discogs',
			'rateyourmusic.com': 'RateYourMusic',
			'wikidata.org': 'Wikidata',
			'last.fm': 'Last.fm',
			'allmusic.com': 'AllMusic',
			'patreon.com': 'Patreon',
			'ko-fi.com': 'Ko-fi',
			'kickstarter.com': 'Kickstarter',
			'bandcamp.com': 'Bandcamp',
			'setlist.fm': 'Setlist.fm',
		};

		// Check exact host matches first
		if (FRIENDLY_NAMES[host]) return FRIENDLY_NAMES[host];

		// Check if host ends with a known domain (for subdomains like artist.bandcamp.com)
		for (const [domain, name] of Object.entries(FRIENDLY_NAMES)) {
			if (host.endsWith(`.${domain}`) || host === domain) return name;
		}

		// Fall back to cleaned hostname
		return host;
	} catch {
		return url;
	}
}

/** Create an empty CategorizedLinks structure. */
export function emptyCategorizedLinks(): Record<LinkCategory, CategorizedLink[]> {
	return {
		streaming: [],
		social: [],
		official: [],
		info: [],
		support: [],
		other: []
	};
}
