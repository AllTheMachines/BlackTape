import { env } from '$env/dynamic/private';
import type { AffiliateConfig } from './types';

/**
 * Read affiliate configuration from environment variables.
 *
 * Uses $env/dynamic/private (NOT $env/static/private) — Cloudflare Pages env vars
 * are runtime-only and not available at build time.
 *
 * Local dev: set values in .dev.vars (Wrangler's secret file).
 * Production: set as encrypted secrets in Cloudflare Pages dashboard.
 *
 * Expected vars:
 *   AFFILIATE_AMAZON_TAG    — Amazon Associates tag (e.g. "mercury-20")
 *   AFFILIATE_APPLE_TOKEN   — Apple at= partner token from Partnerize
 *   AFFILIATE_APPLE_CAMPAIGN — Optional ct= campaign name (max 40 chars)
 */
export function getAffiliateConfig(): AffiliateConfig {
	return {
		amazonTag: env.AFFILIATE_AMAZON_TAG || null,
		appleToken: env.AFFILIATE_APPLE_TOKEN || null,
		appleCampaign: env.AFFILIATE_APPLE_CAMPAIGN || null,
	};
}
