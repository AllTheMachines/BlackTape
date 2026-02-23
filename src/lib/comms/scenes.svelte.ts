/**
 * Scene interaction module — follow, suggest, feature request vote.
 *
 * Primary store: taste.db (Tauri only) via Tauri IPC commands.
 * Secondary social layer: NIP-51 kind 30001 list on Nostr (optional, non-blocking).
 *
 * Web path: upvoteFeatureRequest() uses localStorage only (no taste.db on web).
 * All other functions require Tauri — web is read-only for scene interactions.
 */

import { isTauri } from '$lib/platform';

/** Reactive state for scene follow/suggestion tracking. */
export const sceneFollowState = $state<{
	followedSlugs: Set<string>;
	pendingSuggestions: Map<string, string[]>; // sceneSlug -> artistNames suggested
}>({
	followedSlugs: new Set(),
	pendingSuggestions: new Map()
});

/**
 * Load the user's followed scenes from taste.db.
 * Tauri only — no-op on web.
 * Call once on component mount to hydrate sceneFollowState.
 */
export async function loadSceneFollows(): Promise<void> {
	if (!isTauri()) return;
	try {
		const { invoke } = await import('@tauri-apps/api/core');
		const slugs = await invoke<string[]>('get_scene_follows');
		sceneFollowState.followedSlugs = new Set(slugs);
	} catch (e) {
		console.warn('[scenes] Failed to load scene follows:', e);
	}
}

/**
 * Follow a scene.
 *
 * 1. Writes to taste.db via follow_scene Tauri command (primary, authoritative).
 * 2. Optimistically updates sceneFollowState.
 * 3. Attempts NIP-51 kind 30001 publish (optional social layer, non-blocking).
 *
 * Requires Tauri — no-op on web.
 */
export async function followScene(sceneSlug: string): Promise<void> {
	if (!isTauri()) return;

	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('follow_scene', { sceneSlug });
	} catch (e) {
		console.warn('[scenes] follow_scene invoke failed:', e);
		return;
	}

	// Optimistic UI update
	sceneFollowState.followedSlugs.add(sceneSlug);

	// Attempt NIP-51 publish — fire-and-forget, swallow all errors
	try {
		const { ndkState } = await import('$lib/comms/nostr.svelte.js');
		if (!ndkState.connected || !ndkState.pubkey || !ndkState.ndk) return;

		const { NDKEvent } = await import('@nostr-dev-kit/ndk');

		// Fetch existing NIP-51 kind 30001 list to avoid overwriting it
		const existing = await ndkState.ndk.fetchEvent({
			kinds: [30001],
			authors: [ndkState.pubkey],
			'#d': ['mercury-scenes']
		});

		const event = new NDKEvent(ndkState.ndk);
		event.kind = 30001;

		// Merge existing tags (preserving all current follows) + new slug
		const existingTags: string[][] = existing?.tags ?? [];
		const hasSlug = existingTags.some((t) => t[0] === 't' && t[1] === sceneSlug);
		event.tags = [
			['d', 'mercury-scenes'],
			...existingTags.filter((t) => !(t[0] === 'd')), // remove old d tag, we set it above
			...(hasSlug ? [] : [['t', sceneSlug]])
		];

		await event.publish();
	} catch {
		// Nostr is optional — taste.db follow already written, no action needed
	}
}

/**
 * Unfollow a scene.
 *
 * 1. Removes from taste.db via unfollow_scene Tauri command.
 * 2. Optimistically updates sceneFollowState.
 * 3. Attempts NIP-51 update to remove the tag (non-blocking).
 *
 * Requires Tauri — no-op on web.
 */
export async function unfollowScene(sceneSlug: string): Promise<void> {
	if (!isTauri()) return;

	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('unfollow_scene', { sceneSlug });
	} catch (e) {
		console.warn('[scenes] unfollow_scene invoke failed:', e);
		return;
	}

	// Optimistic UI update
	sceneFollowState.followedSlugs.delete(sceneSlug);

	// Attempt NIP-51 update to remove the tag — fire-and-forget
	try {
		const { ndkState } = await import('$lib/comms/nostr.svelte.js');
		if (!ndkState.connected || !ndkState.pubkey || !ndkState.ndk) return;

		const existing = await ndkState.ndk.fetchEvent({
			kinds: [30001],
			authors: [ndkState.pubkey],
			'#d': ['mercury-scenes']
		});

		if (!existing) return;

		const { NDKEvent } = await import('@nostr-dev-kit/ndk');
		const event = new NDKEvent(ndkState.ndk);
		event.kind = 30001;
		// Filter out the slug being removed
		event.tags = [
			['d', 'mercury-scenes'],
			...existing.tags.filter((t) => !(t[0] === 'd') && !(t[0] === 't' && t[1] === sceneSlug))
		];

		await event.publish();
	} catch {
		// Nostr is optional — taste.db unfollow already written
	}
}

/**
 * Suggest an artist for a scene.
 *
 * Queued in taste.db via suggest_scene_artist. The suggestion feeds into
 * the next detection run as a weighted input. artistMbid may be empty string
 * (user types artist name, not MBID — MBID resolution is best-effort in detection).
 *
 * Requires Tauri — no-op on web.
 */
export async function suggestArtist(
	sceneSlug: string,
	artistMbid: string,
	artistName: string
): Promise<void> {
	if (!isTauri()) return;

	try {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('suggest_scene_artist', { sceneSlug, artistMbid, artistName });

		// Track locally that we suggested this artist for this scene
		const current = sceneFollowState.pendingSuggestions.get(sceneSlug) ?? [];
		if (!current.includes(artistName)) {
			sceneFollowState.pendingSuggestions.set(sceneSlug, [...current, artistName]);
		}
	} catch (e) {
		console.warn('[scenes] suggest_scene_artist invoke failed:', e);
	}
}

/**
 * Upvote a feature request.
 *
 * Tauri: invokes upvote_feature_request → returns new vote count from taste.db.
 * Web: reads/increments localStorage counter (single-user tracking, no server).
 *
 * @returns The new vote count as a number.
 */
export async function upvoteFeatureRequest(featureId: string): Promise<number> {
	if (isTauri()) {
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			const newCount = await invoke<number>('upvote_feature_request', { featureId });
			return newCount;
		} catch (e) {
			console.warn('[scenes] upvote_feature_request invoke failed:', e);
			return 0;
		}
	} else {
		// Web: localStorage-based counter
		const key = `feature_vote_${featureId}`;
		const current = parseInt(localStorage.getItem(key) ?? '0', 10);
		const next = current + 1;
		localStorage.setItem(key, String(next));
		return next;
	}
}
