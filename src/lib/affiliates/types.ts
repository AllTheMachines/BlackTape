/** Supported buy platforms for the "Buy on" row. */
export type BuyPlatform = 'bandcamp' | 'amazon' | 'apple-music' | 'beatport' | 'discogs';

/** A single buy link — either a direct product URL or a pre-filled search fallback. */
export interface BuyLink {
	platform: BuyPlatform;
	label: string;
	url: string;
	/** true = direct product page; false = platform search results (search fallback) */
	isDirect: boolean;
}

/** Affiliate program credentials read from environment variables. */
export interface AffiliateConfig {
	/** Amazon Associates tag (e.g. "mercury-20"), or null if not configured. */
	amazonTag: string | null;
	/** Apple Performance Partners token (the `at=` parameter), or null if not configured. */
	appleToken: string | null;
	/** Optional Apple campaign string (the `ct=` parameter, max 40 chars). */
	appleCampaign: string | null;
}
