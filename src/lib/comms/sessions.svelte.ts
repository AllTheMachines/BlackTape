/**
 * Ephemeral listening party sessions — COMM-06.
 *
 * Sessions use Nostr ephemeral event kinds (20000–29999 per NIP-01).
 * These events are relayed in real-time by relays but MUST NOT be stored.
 * NIP-40 expiration tags (1-hour TTL) reinforce the ephemeral intent.
 *
 * ARCHITECTURAL CONSTRAINT: This module MUST NEVER call any Tauri invoke().
 * Ephemeral session data must never reach taste.db or any local storage.
 * All state lives in Svelte $state — garbage collected when endSession() is called.
 *
 * Nostr event kinds used:
 *   kind:20001 — ephemeral session message (not stored by relays)
 *   kind:20002 — ephemeral session announcement / presence (not stored by relays)
 */

import type { NDKKind } from '@nostr-dev-kit/ndk';
import { ndkState } from './nostr.svelte.js';

const SESSION_TTL_SECONDS = 3600; // 1 hour — NIP-40 expiration hint

export type SessionVisibility = 'public' | 'private';

export interface ListeningSession {
	id: string; // unique session ID (host pubkey + timestamp)
	hostPubkey: string;
	artistName: string;
	releaseName?: string;
	artistMbid?: string; // for deep-linking from messages
	visibility: SessionVisibility;
	inviteCode?: string; // for private sessions — random alphanumeric code
	startedAt: number; // unix timestamp
	participantPubkeys: Set<string>; // participants seen (ephemeral tracking only)
	messages: SessionMessage[];
}

export interface SessionMessage {
	id: string;
	senderPubkey: string;
	content: string;
	createdAt: number;
}

// Active sessions in Svelte $state — cleared on endSession()
export const sessionsState = $state({
	mySession: null as ListeningSession | null, // session this user is hosting
	joinedSession: null as ListeningSession | null, // session this user joined (not hosting)
	publicSessions: [] as ListeningSession[], // public sessions discoverable by others
	loading: false
});

function makeSessionId(hostPubkey: string): string {
	return `${hostPubkey.slice(0, 8)}-${Date.now()}`;
}

function makeInviteCode(): string {
	// 8-char alphanumeric invite code for private sessions
	return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function expirationTag(): string[] {
	return ['expiration', String(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)];
}

/**
 * Create a listening party session.
 *
 * Entry points: artist page "Start a listening party" OR chat overlay "New session" button.
 * Public sessions are announced on Nostr and discoverable via loadPublicSessions().
 * Private sessions generate an invite code for out-of-band sharing.
 *
 * @returns The session ID
 */
export async function createSession(
	artistName: string,
	visibility: SessionVisibility,
	options?: { releaseName?: string; artistMbid?: string }
): Promise<string> {
	const { ndk } = ndkState;
	if (!ndk || !ndkState.pubkey) throw new Error('NDK not initialized');

	const sessionId = makeSessionId(ndkState.pubkey);
	const session: ListeningSession = {
		id: sessionId,
		hostPubkey: ndkState.pubkey,
		artistName,
		releaseName: options?.releaseName,
		artistMbid: options?.artistMbid,
		visibility,
		inviteCode: visibility === 'private' ? makeInviteCode() : undefined,
		startedAt: Math.floor(Date.now() / 1000),
		participantPubkeys: new Set([ndkState.pubkey]),
		messages: []
	};

	sessionsState.mySession = session;

	// Announce the session on Nostr (kind:20002 — ephemeral announcement)
	// Public sessions are discoverable; private sessions announce only to invitees via invite code check
	if (visibility === 'public') {
		const { NDKEvent } = await import('@nostr-dev-kit/ndk');
		const event = new NDKEvent(ndk);
		event.kind = 20002; // ephemeral session announcement
		event.content = JSON.stringify({
			sessionId,
			artistName,
			releaseName: options?.releaseName,
			artistMbid: options?.artistMbid,
			visibility: 'public'
		});
		event.tags = [['t', 'mercury'], ['t', 'listening-party'], expirationTag()];
		await event.publish();
	}

	// Subscribe to session messages
	_subscribeToSessionMessages(sessionId);

	return sessionId;
}

/**
 * Join an existing session (by session ID or invite code for private sessions).
 *
 * Looks up the session in the publicSessions list if available; otherwise
 * constructs a minimal session object from the ID for private sessions.
 */
export async function joinSession(sessionId: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk || !ndkState.pubkey) throw new Error('NDK not initialized');

	// Find session in publicSessions list or construct a minimal session object
	const existing = sessionsState.publicSessions.find((s) => s.id === sessionId);
	const joined: ListeningSession = existing ?? {
		id: sessionId,
		hostPubkey: '',
		artistName: 'Unknown',
		visibility: 'private',
		startedAt: Math.floor(Date.now() / 1000),
		participantPubkeys: new Set([ndkState.pubkey]),
		messages: []
	};

	sessionsState.joinedSession = joined;

	// Subscribe to session messages
	_subscribeToSessionMessages(sessionId);

	// Announce presence (ephemeral kind:20002 with presence flag)
	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20002;
	event.content = JSON.stringify({ sessionId, presence: true });
	event.tags = [['e', sessionId], ['t', 'mercury'], expirationTag()];
	await event.publish();
}

/**
 * Send a message in the active session (kind:20001 — ephemeral, not stored by relays).
 *
 * Publishes to Nostr and optimistically adds to local state.
 * NIP-40 expiration tag ensures relays that do cache ephemeral events
 * will purge within 1 hour.
 */
export async function sendPartyMessage(sessionId: string, content: string): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;

	const { NDKEvent } = await import('@nostr-dev-kit/ndk');
	const event = new NDKEvent(ndk);
	event.kind = 20001; // ephemeral session message
	event.content = content;
	event.tags = [['e', sessionId], ['t', 'mercury'], expirationTag()];
	await event.publish();

	// Optimistic local add
	const msg: SessionMessage = {
		id: `local-${Date.now()}`,
		senderPubkey: ndkState.pubkey ?? '',
		content,
		createdAt: Math.floor(Date.now() / 1000)
	};
	const session = sessionsState.mySession ?? sessionsState.joinedSession;
	if (session) {
		session.messages = [...session.messages, msg];
	}
}

// Internal: module-level Map of active subscriptions to allow cleanup on endSession()
const _sessionSubs = new Map<string, { stop: () => void }>();

/**
 * Internal: subscribe to session message events (kind:20001 + kind:20002).
 *
 * Deduplicates incoming messages by event ID.
 * Tracks participant pubkeys as presence events arrive.
 */
function _subscribeToSessionMessages(sessionId: string): void {
	const { ndk } = ndkState;
	if (!ndk) return;

	// NDKKind enum doesn't include ephemeral kinds 20001/20002 — double cast required
	// when numeric literal types don't overlap with enum members
	const sub = ndk.subscribe(
		{ kinds: [20001, 20002] as unknown as NDKKind[], '#e': [sessionId] },
		{ closeOnEose: false }
	);

	sub.on('event', (event) => {
		const session = sessionsState.mySession ?? sessionsState.joinedSession;
		if (!session || session.id !== sessionId) return;

		if (event.kind === 20001) {
			// Session message — deduplicate by event ID
			const msg: SessionMessage = {
				id: event.id,
				senderPubkey: event.pubkey,
				content: event.content,
				createdAt: event.created_at ?? Math.floor(Date.now() / 1000)
			};
			if (!session.messages.find((m) => m.id === event.id)) {
				session.messages = [...session.messages, msg];
				session.participantPubkeys.add(event.pubkey);
			}
		}

		if (event.kind === 20002) {
			// Presence or announcement — track participant
			session.participantPubkeys.add(event.pubkey);
		}
	});

	_sessionSubs.set(sessionId, sub);
}

/**
 * End session — fully clears all state. No persistence. No exceptions.
 *
 * Per architectural requirement: "nothing is preserved — messages, participants,
 * and context are fully deleted" when a session ends.
 *
 * The publicSessions discovery list is intentionally preserved — it reflects
 * other active sessions, not the ended session's data.
 */
export function endSession(): void {
	const sessionId = sessionsState.mySession?.id ?? sessionsState.joinedSession?.id;
	if (sessionId) {
		const sub = _sessionSubs.get(sessionId);
		if (sub) {
			sub.stop();
			_sessionSubs.delete(sessionId);
		}
	}

	// Complete state wipe — $state assignment clears all reactive listeners
	sessionsState.mySession = null;
	sessionsState.joinedSession = null;
	// Note: publicSessions list remains (it's the discovery list, not session-specific data)
}

/**
 * Load currently-active public listening parties from Nostr relays.
 *
 * Queries for recent kind:20002 announcements tagged with 'mercury' + 'listening-party'.
 * Only returns events within the last hour (SESSION_TTL_SECONDS window).
 */
export async function loadPublicSessions(): Promise<void> {
	const { ndk } = ndkState;
	if (!ndk) return;
	sessionsState.loading = true;

	// NDKKind enum doesn't include ephemeral kinds 20001/20002 — double cast required
	// when numeric literal types don't overlap with enum members
	const events = await ndk.fetchEvents({
		kinds: [20002] as unknown as NDKKind[],
		'#t': ['mercury', 'listening-party'],
		since: Math.floor(Date.now() / 1000) - SESSION_TTL_SECONDS, // only recent (within 1hr)
		limit: 50
	});

	const sessions: ListeningSession[] = [];
	for (const event of events) {
		try {
			const meta = JSON.parse(event.content) as {
				sessionId?: string;
				artistName?: string;
				releaseName?: string;
				artistMbid?: string;
				visibility?: string;
			};
			if (meta.sessionId && meta.visibility === 'public') {
				sessions.push({
					id: meta.sessionId,
					hostPubkey: event.pubkey,
					artistName: meta.artistName ?? 'Unknown',
					releaseName: meta.releaseName,
					artistMbid: meta.artistMbid,
					visibility: 'public',
					startedAt: event.created_at ?? Math.floor(Date.now() / 1000),
					participantPubkeys: new Set([event.pubkey]),
					messages: []
				});
			}
		} catch {
			continue;
		}
	}

	sessionsState.publicSessions = sessions;
	sessionsState.loading = false;
}

/**
 * Convenience export: active public sessions sorted by recency (newest first).
 *
 * Derived from sessionsState.publicSessions — updates reactively when
 * loadPublicSessions() populates the list.
 */
export const activePublicSessions = $derived(
	sessionsState.publicSessions.slice().sort((a, b) => b.startedAt - a.startedAt)
);
