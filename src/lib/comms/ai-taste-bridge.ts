/**
 * AI taste bridge — musical context for DM conversations.
 *
 * Implements ROADMAP success criteria 6 (AI taste translation) and 7
 * (AI matchmaking context). When a DM conversation thread is opened, this
 * module fetches the peer's public Mercury taste profile from Nostr, then
 * calls the user's configured AI provider to generate:
 *   (a) a "musical bridge" explanation of why their tastes overlap
 *   (b) 2-3 natural conversation starter suggestions
 *
 * Results are cached by peerPubkey for the session — generated once,
 * stays alive until page reload. Uses getAiProvider() from the AI engine
 * (Phase 9 pattern — same provider powers all AI features).
 */

import { ndkState } from './nostr.svelte.js';
import { getAiProvider } from '$lib/ai/engine.js';

/** Bridge result for a single peer conversation. */
export interface TasteBridgeResult {
	peerPubkey: string;
	bridgeExplanation: string; // "Your tastes converge around post-punk atmosphere..."
	conversationStarters: string[]; // ["Have you heard X's latest?", ...]
	loading: boolean;
	error: string | null;
}

/**
 * Session cache keyed by peerPubkey.
 * Generated once per session — resets on page reload.
 *
 * Note: Map is reactive in Svelte 5 only when wrapped in $state.
 * Callers must use tasteBridgeState.get(pubkey) reactively.
 */
export const tasteBridgeState = $state(new Map<string, TasteBridgeResult>());

/**
 * Generate the AI taste bridge for a given peer pubkey.
 *
 * Call this when a dm-thread view is opened (chatState.view === 'dm-thread').
 * Returns immediately — sets loading state and updates tasteBridgeState
 * reactively when the AI response arrives.
 */
export async function getTasteBridge(peerPubkey: string): Promise<void> {
	// Already generated this session and not loading — skip
	const cached = tasteBridgeState.get(peerPubkey);
	if (cached && !cached.loading) return;

	// Set loading state
	tasteBridgeState.set(peerPubkey, {
		peerPubkey,
		bridgeExplanation: '',
		conversationStarters: [],
		loading: true,
		error: null
	});

	try {
		// Load the user's own taste profile from reactive state
		// Dynamic import so this module works in both Tauri and web contexts
		const { tasteProfile } = await import('$lib/taste/profile.svelte.js');

		// Build own taste summary from loaded profile
		// Tags sorted by weight (descending), take top 8
		const sortedTags = [...tasteProfile.tags]
			.sort((a, b) => b.weight - a.weight)
			.slice(0, 8)
			.map((t) => t.tag);
		const ownTagStr = sortedTags.join(', ') || 'varied taste';

		// Top 5 favorite artists by name
		const ownArtistStr =
			tasteProfile.favorites
				.slice(0, 5)
				.map((f) => f.artist_name)
				.join(', ') || 'various artists';

		const ownProfile = `Tags: ${ownTagStr}. Artists: ${ownArtistStr}.`;

		// Fetch peer's public Mercury taste profile from Nostr.
		// Phase 9 design: users publish their taste fingerprint as kind:30078
		// with 'd' tag of 'mercury-taste-profile'.
		const ndk = ndkState.ndk;
		let peerTasteProfile = 'unknown taste profile';

		if (ndk) {
			try {
				const events = await ndk.fetchEvents({
					kinds: [30078],
					authors: [peerPubkey],
					'#d': ['mercury-taste-profile'],
					limit: 1
				});
				const profileEvent = [...events][0];
				if (profileEvent?.content) {
					const profile: { topTags?: string[]; topArtists?: string[] } = JSON.parse(
						profileEvent.content
					);
					const tags = (profile.topTags ?? []).slice(0, 8).join(', ');
					const artists = (profile.topArtists ?? []).slice(0, 5).join(', ');
					peerTasteProfile = `Tags: ${tags || 'none shared'}. Artists: ${artists || 'none shared'}.`;
				}
			} catch {
				// Peer hasn't published a taste profile — proceed with partial context
			}
		}

		// Get the user's configured AI provider (null if none set up)
		const provider = getAiProvider();

		if (!provider) {
			// AI not configured — show graceful fallback (no error, just a hint)
			tasteBridgeState.set(peerPubkey, {
				peerPubkey,
				bridgeExplanation: 'Configure an AI model in Settings to see your musical connection.',
				conversationStarters: ['What have you been listening to lately?'],
				loading: false,
				error: null
			});
			return;
		}

		const prompt = `You are Mercury's taste analyst. Given two music listener profiles, explain their musical connection and suggest conversation starters.

Your profile: ${ownProfile}
Their profile: ${peerTasteProfile}

Respond with a JSON object:
{
  "bridge": "1-2 sentences explaining the musical bridge between these tastes — be specific about shared aesthetics, not generic.",
  "starters": ["starter 1", "starter 2", "starter 3"]
}

Keep it conversational, music-nerd specific, and under 60 words for the bridge. Starters should be natural questions or observations, not generic openers. Respond ONLY with the JSON object, no other text.`;

		// Use the AiProvider.complete() interface — works with both local llama-server and remote APIs
		const responseText = await provider.complete(prompt, {
			temperature: 0.7,
			maxTokens: 200
		});

		let parsed: { bridge?: string; starters?: string[] } = {};
		try {
			// Strip any markdown code fence if present
			const cleaned = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
			parsed = JSON.parse(cleaned);
		} catch {
			// Model returned non-JSON — use defaults below
		}

		tasteBridgeState.set(peerPubkey, {
			peerPubkey,
			bridgeExplanation:
				parsed.bridge ?? 'You share a musical sensibility — start talking to find out how.',
			conversationStarters: parsed.starters ?? ['What have you been into lately?'],
			loading: false,
			error: null
		});
	} catch (e: unknown) {
		const msg = e instanceof Error ? e.message : 'Failed to generate taste context';
		tasteBridgeState.set(peerPubkey, {
			peerPubkey,
			bridgeExplanation: '',
			conversationStarters: [],
			loading: false,
			error: msg
		});
	}
}
