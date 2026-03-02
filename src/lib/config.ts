// The one variable. Change this, everything follows.
export const PROJECT_NAME = 'BlackTape';
export const PROJECT_TAGLINE = 'Dig deeper.';

// BlackTape's project Nostr public key (hex) — used for backer list fetch.
// Placeholder: fill in once the BlackTape Nostr identity keypair is generated.
// When empty, the backers page shows "Backer credits coming soon".
export const BLACKTAPE_PUBKEY = '';

// Database download URL — the gzipped mercury.db hosted as a release asset.
// Update this when a new database version is published.
export const DATABASE_DOWNLOAD_URL =
	'https://github.com/AllTheMachines/Mercury/releases/latest/download/mercury.db.gz';

// Help base URL — change to 'https://docs.blacktape.app' to serve help externally.
// When set to a relative path, help opens in-app. When set to https://, shell.open() is used.
export const HELP_BASE_URL = '/help';
