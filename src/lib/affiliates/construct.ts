import type { BuyLink, AffiliateConfig } from './types';

/**
 * Build the full "Buy on" link set for a release.
 *
 * Always returns all five platforms in this order:
 * Bandcamp, Amazon Music, Apple Music, Beatport, Discogs.
 *
 * Platforms with active affiliate programs (Amazon, Apple Music) get
 * affiliate-coded URLs when config IDs are present.
 * Bandcamp, Beatport, Discogs have no affiliate programs — links are
 * plain search fallbacks or direct URLs (Bandcamp only).
 *
 * @param artistName  — raw artist name (will be URL-encoded)
 * @param releaseTitle — raw release title (will be URL-encoded)
 * @param bandcampUrl  — release-level Bandcamp URL from MusicBrainz URL-rels, or null
 * @param config       — affiliate credentials from environment
 */
export function buildBuyLinks(
	artistName: string,
	releaseTitle: string,
	bandcampUrl: string | null,
	config: AffiliateConfig
): BuyLink[] {
	const query = encodeURIComponent(`${artistName} ${releaseTitle}`);

	return [
		buildBandcampLink(bandcampUrl, artistName, releaseTitle),
		buildAmazonLink(query, config.amazonTag),
		buildAppleMusicLink(query, config.appleToken, config.appleCampaign),
		buildBeatportLink(artistName, releaseTitle),
		buildDiscogsLink(query),
	];
}

function buildBandcampLink(directUrl: string | null, artist: string, title: string): BuyLink {
	if (directUrl) {
		// Direct release URL from MusicBrainz — send user to specific album page
		return { platform: 'bandcamp', label: 'Bandcamp', url: directUrl, isDirect: true };
	}
	// No affiliate program for Bandcamp — plain search fallback
	const q = encodeURIComponent(`${artist} ${title}`);
	return {
		platform: 'bandcamp',
		label: 'Bandcamp',
		url: `https://bandcamp.com/search?q=${q}`,
		isDirect: false,
	};
}

function buildAmazonLink(query: string, tag: string | null): BuyLink {
	// Amazon Associates: 5% commission on music purchases
	// Always search fallback — we don't have ASINs
	const base = `https://www.amazon.com/s?k=${query}`;
	const url = tag ? `${base}&tag=${tag}` : base;
	return { platform: 'amazon', label: 'Amazon Music', url, isDirect: false };
}

function buildAppleMusicLink(query: string, token: string | null, campaign: string | null): BuyLink {
	// Apple Performance Partners: 7% on music purchases
	// Always search fallback — we don't have Apple catalog IDs
	let url = `https://music.apple.com/us/search?term=${query}&app=music&ls=1`;
	if (token) url += `&at=${token}`;
	if (campaign) url += `&ct=${encodeURIComponent(campaign.slice(0, 40))}`; // max 40 chars
	return { platform: 'apple-music', label: 'Apple Music', url, isDirect: false };
}

function buildBeatportLink(artist: string, title: string): BuyLink {
	// Beatport affiliate program ended 2008 — plain search fallback only
	const q = encodeURIComponent(`${artist} ${title}`);
	return {
		platform: 'beatport',
		label: 'Beatport',
		url: `https://www.beatport.com/search?q=${q}`,
		isDirect: false,
	};
}

function buildDiscogsLink(query: string): BuyLink {
	// Discogs has no affiliate program — plain search into marketplace (buy listings)
	// Use /sell/list not /search — sends users to vinyl-for-sale listings, not database
	return {
		platform: 'discogs',
		label: 'Discogs',
		url: `https://www.discogs.com/sell/list?q=${query}&type=release`,
		isDirect: false,
	};
}
