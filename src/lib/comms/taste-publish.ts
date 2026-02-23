import { ndkState } from './nostr.svelte.js';

// Session-level flag — publish at most once per session to be respectful to relays.
// kind:30078 is replaceable, so re-publishing is harmless, but once per session is sufficient.
let tastePublished = false;

/**
 * Publishes the user's taste profile as a Nostr kind:30078 event.
 * Silent skip if not connected or taste profile is empty.
 * Content shape must match ai-taste-bridge.ts consumer (d tag: 'mercury-taste-profile').
 */
export async function publishTasteProfile(): Promise<'published' | 'skipped'> {
	if (tastePublished) return 'skipped';

	const { ndk } = ndkState;
	if (!ndk || !ndkState.connected) return 'skipped'; // silent skip per user decision

	const { tasteProfile } = await import('$lib/taste/profile.svelte.js');
	if (!tasteProfile.isLoaded || tasteProfile.tags.length === 0) return 'skipped';

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');

	const topTags = [...tasteProfile.tags]
		.sort((a, b) => b.weight - a.weight)
		.slice(0, 8)
		.map((t: { tag: string }) => t.tag);

	const topArtists = tasteProfile.favorites
		.slice(0, 5)
		.map((f: { artist_name: string }) => f.artist_name);

	const event = new NDKEvent(ndk);
	event.kind = 30078;
	event.content = JSON.stringify({ topTags, topArtists });
	event.tags = [['d', 'mercury-taste-profile']]; // MUST match ai-taste-bridge.ts:91

	await event.publish();
	tastePublished = true;
	return 'published';
}
