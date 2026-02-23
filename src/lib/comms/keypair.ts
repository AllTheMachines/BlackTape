import { openDB } from 'idb';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

const DB_NAME = 'mercury-comms';
const STORE = 'keypair';

/**
 * Loads the Nostr keypair from IndexedDB, or generates + stores a new one.
 *
 * Nostr uses secp256k1 keys, which are NOT supported by WebCrypto's SubtleCrypto.
 * We store the raw Uint8Array (not a CryptoKey) in IndexedDB — IndexedDB supports
 * structured cloning of typed arrays natively.
 *
 * The private key is NEVER stored in localStorage — IndexedDB only.
 */
export async function loadOrCreateKeypair(): Promise<{ privateKey: string; publicKey: string }> {
	const db = await openDB(DB_NAME, 1, {
		upgrade(db) {
			db.createObjectStore(STORE);
		}
	});

	let privKeyBytes: Uint8Array | undefined = await db.get(STORE, 'privateKey');

	if (!privKeyBytes) {
		privKeyBytes = generateSecretKey();
		await db.put(STORE, privKeyBytes, 'privateKey');
	}

	const privateKey = bytesToHex(privKeyBytes);
	const publicKey = getPublicKey(privKeyBytes);

	return { privateKey, publicKey };
}
