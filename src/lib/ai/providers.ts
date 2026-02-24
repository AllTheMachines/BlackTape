/**
 * AI provider configuration for Phase 18 AI Auto-News.
 *
 * Affiliate URL is a hardcoded constant — not an env var.
 * In Tauri desktop, env vars (Cloudflare pattern) do not apply.
 * The affiliate badge is visible BEFORE the user clicks.
 */

export interface AiProvider {
	id: string;
	label: string;
	baseUrl: string;
	badge: string | null; // Shown inline next to provider name
	affiliateUrl: string | null; // Opens in browser when user selects this provider
	instructions: string; // Setup instructions shown in-app
	defaultModel: string; // Pre-filled when user selects this provider
}

export const AI_PROVIDERS: readonly AiProvider[] = [
	{
		id: 'aimlapi',
		label: 'AI/ML API',
		baseUrl: 'https://api.aimlapi.com/v1',
		badge: 'Recommended — affiliate link',
		affiliateUrl: 'https://aimlapi.com/?via=mercury',
		instructions: 'Sign up, copy your API key, paste below. Access 200+ models with one key.',
		defaultModel: 'claude-3-5-haiku-20241022'
	},
	{
		id: 'openai',
		label: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1',
		badge: null,
		affiliateUrl: null,
		instructions: 'Use your OpenAI platform API key.',
		defaultModel: 'gpt-4o-mini'
	},
	{
		id: 'anthropic',
		label: 'Anthropic (via aimlapi)',
		baseUrl: 'https://api.aimlapi.com/v1',
		badge: null,
		affiliateUrl: null,
		instructions:
			'Use your AI/ML API key to access Anthropic models with standard Bearer auth.',
		defaultModel: 'claude-3-5-haiku-20241022'
	}
] as const;

/** Look up a provider config by id. Returns undefined if not found. */
export function getProviderById(id: string): AiProvider | undefined {
	return AI_PROVIDERS.find((p) => p.id === id);
}
