import NDK from '@nostr-dev-kit/ndk';
import { loadOrCreateKeypair } from './keypair.js';

/** Mercury's default relay pool — maximum 4 relays. */
export const MERCURY_RELAYS = [
	'wss://nos.lol',
	'wss://relay.damus.io',
	'wss://nostr.mom',
	'wss://relay.nostr.band'
];

/**
 * Reactive NDK singleton state.
 * Uses .svelte.ts extension so $state runes are compiled correctly.
 */
export const ndkState = $state<{
	ndk: NDK | null;
	pubkey: string | null;
	connected: boolean;
}>({
	ndk: null,
	pubkey: null,
	connected: false
});

/**
 * Initialize the Nostr communication layer.
 * - Loads or generates a stable Nostr keypair from IndexedDB
 * - Creates an NDK instance with the Mercury relay pool
 * - Connects to relays and sets ndkState
 *
 * Safe to call multiple times — subsequent calls are no-ops if already connected.
 */
export async function initNostr(): Promise<void> {
	if (ndkState.connected) return;

	const { privateKey, publicKey } = await loadOrCreateKeypair();

	const ndk = new NDK({
		explicitRelayUrls: MERCURY_RELAYS,
		enableOutboxModel: true
	});

	// Dynamic import to ensure NDKPrivateKeySigner is only loaded when needed
	const { NDKPrivateKeySigner } = await import('@nostr-dev-kit/ndk');
	ndk.signer = new NDKPrivateKeySigner(privateKey);

	await ndk.connect();

	ndkState.ndk = ndk;
	ndkState.pubkey = publicKey;
	ndkState.connected = true;
}
