/**
 * Room moderation module — AI safety filter + owner moderation tools.
 *
 * Provides the AI-gated content safety filter for room names and
 * client-side moderation tools (flag/delete/kick/ban/slow mode/co-mod).
 *
 * Uses the user's existing AI provider from Phase 9 — no new AI
 * configuration required.
 */

import { ndkState } from './nostr.svelte.js';

// Slow mode timer options (seconds between messages per user)
export const SLOW_MODE_OPTIONS = [30, 120, 300, 900] as const; // 30s, 2min, 5min, 15min

/**
 * Check room name safety using the user's configured AI provider.
 *
 * Uses OpenAI /v1/moderations endpoint (free) for API-key users,
 * falls back to a simple word-pattern check for local model users
 * or when the moderation endpoint is unavailable.
 */
export async function checkRoomNameSafety(
	name: string
): Promise<{ safe: boolean; reason?: string }> {
	// Dynamic import to avoid loading AI engine before it's initialized
	const { getAiProvider } = await import('$lib/ai/engine.js');
	const provider = getAiProvider();

	if (!provider) {
		// AI not configured — this shouldn't happen (room creation is gated on aiState.enabled)
		// but fail open so the UX doesn't silently block room creation
		return { safe: true };
	}

	// Try to get provider config for the moderation endpoint call
	// We need baseUrl and apiKey — access through aiState
	try {
		const { aiState } = await import('$lib/ai/state.svelte.js');

		if (aiState.apiKey && aiState.apiBaseUrl) {
			// Try /v1/moderations endpoint (free for OpenAI, may 404 for other providers)
			const response = await fetch(`${aiState.apiBaseUrl}/v1/moderations`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${aiState.apiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ input: name })
			});

			if (response.ok) {
				const result = (await response.json()) as {
					results?: Array<{ flagged?: boolean }>;
				};
				const flagged = result.results?.[0]?.flagged ?? false;
				return {
					safe: !flagged,
					reason: flagged ? 'Room name flagged by content filter' : undefined
				};
			}
		}
	} catch {
		// Fall through to simple check
	}

	// Fallback: simple keyword scan for local model providers or when API unavailable
	// (Intentionally minimal — this is a best-effort fallback, not a complete filter)
	const BLOCKED_PATTERNS = /\b(spam|slur|abuse|hate|csam|cp)\b/i;
	const safe = !BLOCKED_PATTERNS.test(name);
	return { safe, reason: safe ? undefined : 'Room name contains disallowed content' };
}

/**
 * Flagged messages — logged in local state, owner notified, nothing visible to others.
 * Map<channelId, Set<eventId>>
 */
export const flaggedMessages = $state(new Map<string, Set<string>>());

/** Flag a message silently. Flagged messages appear in the owner's ModerationQueue. */
export function flagMessage(channelId: string, eventId: string): void {
	if (!flaggedMessages.has(channelId)) {
		flaggedMessages.set(channelId, new Set());
	}
	flaggedMessages.get(channelId)!.add(eventId);
	// Note: In a full implementation, this would also notify the room owner
	// via a private kind:14 DM to the owner's pubkey. For Phase 10,
	// flagged messages appear in the owner's ModerationQueue component.
}

/** Delete a room message (NIP-28 kind:43 — hides message for clients that respect it). */
export async function deleteRoomMessage(channelId: string, messageEventId: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;
	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 43; // NIP-28: hide message
	event.tags = [
		['e', messageEventId],
		['e', channelId]
	];
	event.content = '';
	await event.publish();
}

/** Kick a user from a room (NIP-28 kind:44 — mute user for clients that respect it). */
export async function kickUser(channelId: string, userPubkey: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;
	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 44; // NIP-28: mute user
	event.tags = [
		['p', userPubkey],
		['e', channelId]
	];
	event.content = '';
	await event.publish();
}

/**
 * Banned users — Nostr has no protocol-level ban; this is client-enforced.
 * Map<channelId, Set<pubkey>>
 */
export const bannedUsers = $state(new Map<string, Set<string>>());

/** Ban a user: record locally and kick them from the room. */
export function banUser(channelId: string, userPubkey: string): void {
	if (!bannedUsers.has(channelId)) bannedUsers.set(channelId, new Set());
	bannedUsers.get(channelId)!.add(userPubkey);
	// Also kick them
	kickUser(channelId, userPubkey);
}

/**
 * Slow mode state — minimum seconds between messages per user (client-enforced).
 * Map<channelId, seconds> — 0 means off.
 */
export const slowModeState = $state(new Map<string, number>());

/** Set slow mode for a room. Pass 0 to disable. */
export function setSlowMode(
	channelId: string,
	seconds: (typeof SLOW_MODE_OPTIONS)[number] | 0
): void {
	slowModeState.set(channelId, seconds);
}

/**
 * Room moderators — Mercury convention: co-mods tracked client-side.
 * Map<channelId, Set<pubkey>>
 */
export const roomModerators = $state(new Map<string, Set<string>>());

/** Appoint a co-moderator for a room. */
export function appointModerator(channelId: string, userPubkey: string): void {
	if (!roomModerators.has(channelId)) roomModerators.set(channelId, new Set());
	roomModerators.get(channelId)!.add(userPubkey);
}

/** Auto-archive threshold: 30 days of inactivity (in milliseconds). */
export const ARCHIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Check if a room should be considered archived based on its last activity.
 *
 * @param lastMessageAt - Unix timestamp of last message (null if no messages)
 * @param createdAt - Unix timestamp of room creation
 */
export function isRoomArchived(lastMessageAt: number | null, createdAt: number): boolean {
	const reference = lastMessageAt ?? createdAt;
	return Date.now() - reference * 1000 > ARCHIVE_THRESHOLD_MS;
}
