<script lang="ts">
	import { spotifyState } from '$lib/spotify/state.svelte';

	type WizardStep = 'setup' | 'waiting' | 'success';
	let step = $state<WizardStep>(spotifyState.connected ? 'success' : 'setup');
	let clientIdInput = $state('');
	let cancelPort = $state<number | null>(null);
	let errorMessage = $state<string | null>(null);

	let isConnected = $derived(spotifyState.connected);
	let reauthorizing = $state(false);
	let clientIdInitialized = $state(false);

	// Pre-populate Client ID once it's available from DB hydration (reactive — handles race condition).
	$effect(() => {
		if (!clientIdInitialized && spotifyState.clientId) {
			clientIdInput = spotifyState.clientId;
			clientIdInitialized = true;
		}
	});

	async function focusWindow() {
		try {
			const { getCurrentWindow } = await import('@tauri-apps/api/window');
			await getCurrentWindow().setFocus();
		} catch { /* not in Tauri */ }
	}

	// When spotifyState.connected becomes true externally (e.g. boot hydration), sync step.
	$effect(() => {
		if (spotifyState.connected && step !== 'success' && !reauthorizing) {
			step = 'success';
		}
	});

	async function handleAuthorize() {
		if (!clientIdInput.trim()) return;
		step = 'waiting';
		errorMessage = null;
		try {
			const { startSpotifyAuth, saveSpotifyTokens } = await import('$lib/spotify/auth');
			const { setSpotifyConnected } = await import('$lib/spotify/state.svelte');
			const result = await startSpotifyAuth(clientIdInput.trim());
			await saveSpotifyTokens(result);
			setSpotifyConnected(result);
			reauthorizing = false;
			step = 'success';
		} catch (e) {
			reauthorizing = false;
			step = 'setup';
			errorMessage = e instanceof Error ? e.message : 'Authorization failed.';
		}
	}

	async function handleCancel() {
		// cancelPort is stored for future use; for now, just reset step.
		// The tauri-plugin-oauth server will time out after 120s.
		if (cancelPort !== null) {
			try {
				const { cancel } = await import('@fabianlars/tauri-plugin-oauth');
				await cancel(cancelPort);
			} catch {
				// ignore — server may have already closed
			}
			cancelPort = null;
		}
		step = 'setup';
	}

	async function handleDisconnect() {
		const { clearSpotifyTokens } = await import('$lib/spotify/auth');
		const { clearSpotifyState } = await import('$lib/spotify/state.svelte');
		await clearSpotifyTokens();
		clearSpotifyState();
		clientIdInput = '';
		reauthorizing = false;
		step = 'setup';
	}
</script>

<div class="import-card" data-testid="spotify-settings">
	{#if isConnected || step === 'success'}
		<!-- Step 3: Connected state -->
		<div class="import-card-header">
			<span class="import-platform">Spotify</span>
			<span class="connected-badge">Connected</span>
		</div>
		<p class="import-card-desc">
			Connected as <strong class="display-name">{spotifyState.displayName || 'Spotify user'}</strong>.
			Top tracks will play via Spotify Desktop.
		</p>
		<div class="import-card-actions">
			<button class="import-btn" onclick={() => { reauthorizing = true; clientIdInput = spotifyState.clientId ?? ''; step = 'setup'; }}>
				Re-authorize
			</button>
			<button class="disconnect-btn" onclick={handleDisconnect}>
				Disconnect
			</button>
		</div>
	{:else if step === 'waiting'}
		<!-- Step 2: Waiting for OAuth callback -->
		<div class="waiting-row">
			<span class="spinner" aria-hidden="true">⟳</span>
			<span class="waiting-text">Waiting for Spotify authorization...</span>
		</div>
		<p class="import-card-desc">
			Your browser should have opened the Spotify login page. Complete authorization there.
		</p>
		<div class="import-card-actions">
			<button class="import-btn" onclick={handleCancel}>Cancel</button>
		</div>
	{:else}
		<!-- Step 1: Setup — get Client ID -->
		<p class="import-card-desc">
			Connect your Spotify account to play artist top tracks in Spotify Desktop.
		</p>

		<div class="setup-steps">
			<ol class="steps-list">
				<li>
					Go to <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">developer.spotify.com/dashboard</a>
					and create an app (if you don't have one)
				</li>
				<li>
					Set the Redirect URI to: <code class="redirect-uri">http://127.0.0.1</code>
					<span class="redirect-note">(exactly — no port, no path)</span>
				</li>
				<li>
					Copy your Client ID from the app settings
				</li>
			</ol>

			<!-- Spotify dashboard mockup — HTML/CSS, no binary assets -->
			<div class="dashboard-mockup" aria-hidden="true">
				<div class="mockup-chrome">
					<span class="mockup-dot"></span>
					<span class="mockup-dot"></span>
					<span class="mockup-dot"></span>
					<span class="mockup-url">developer.spotify.com/dashboard</span>
				</div>
				<div class="mockup-body">
					<div class="mockup-field highlighted">
						<span class="mockup-label">Client ID</span>
						<span class="mockup-value">a1b2c3d4e5f6...</span>
					</div>
					<div class="mockup-field">
						<span class="mockup-label">Client Secret</span>
						<span class="mockup-value">••••••••••••</span>
					</div>
					<div class="mockup-field">
						<span class="mockup-label">Redirect URIs</span>
						<span class="mockup-value">http://127.0.0.1</span>
					</div>
				</div>
			</div>
		</div>

		<div class="import-card-fields">
			<input
				type="text"
				class="text-input"
				bind:value={clientIdInput}
				placeholder="Spotify Client ID"
				onmousedown={focusWindow}
			/>
		</div>

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}

		<div class="import-card-actions">
			<button
				class="import-btn"
				onclick={handleAuthorize}
				disabled={!clientIdInput.trim()}
			>
				Authorize
			</button>
		</div>
	{/if}
</div>

<style>
	/* ─── Card wrapper (uses settings page import-card pattern) ──────────── */

	.import-card {
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 0;
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.import-card-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.import-platform {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--t-1);
	}

	.connected-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 0;
		background: color-mix(in oklch, var(--acc) 15%, transparent);
		color: var(--acc);
		border: 1px solid color-mix(in oklch, var(--acc) 40%, transparent);
	}

	.import-card-desc {
		font-size: 0.78rem;
		color: var(--t-3);
		line-height: 1.5;
		margin: 0;
	}

	.display-name {
		color: var(--t-1);
		font-weight: 500;
	}

	/* ─── Step 1: Setup steps + mockup ───────────────────────────────────── */

	.setup-steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.steps-list {
		padding-left: 1.25rem;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.steps-list li {
		font-size: 0.78rem;
		color: var(--t-2);
		line-height: 1.5;
	}

	.steps-list a {
		color: var(--acc);
		text-decoration: none;
	}

	.steps-list a:hover {
		text-decoration: underline;
	}

	.redirect-uri {
		font-size: 0.75rem;
		background: var(--bg-2);
		padding: 1px 5px;
		border-radius: 0;
		color: var(--t-1);
		font-family: monospace;
		border: 1px solid var(--b-1);
	}

	.redirect-note {
		font-size: 0.7rem;
		color: var(--t-3);
		margin-left: 4px;
	}

	/* ─── Spotify dashboard mockup ───────────────────────────────────────── */

	.dashboard-mockup {
		border: 1px solid var(--b-2);
		border-radius: 0;
		overflow: hidden;
		font-size: 0.72rem;
		max-width: 340px;
		background: var(--bg-2);
	}

	.mockup-chrome {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 6px 10px;
		background: var(--bg-3);
		border-bottom: 1px solid var(--b-1);
	}

	.mockup-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--b-2);
		flex-shrink: 0;
	}

	.mockup-url {
		font-size: 0.65rem;
		color: var(--t-3);
		margin-left: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mockup-body {
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.mockup-field {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 6px;
		border-radius: 0;
	}

	.mockup-field.highlighted {
		background: color-mix(in oklch, var(--acc) 10%, transparent);
		border: 1px solid color-mix(in oklch, var(--acc) 30%, transparent);
	}

	.mockup-label {
		color: var(--t-3);
		min-width: 80px;
		flex-shrink: 0;
	}

	.mockup-value {
		color: var(--t-2);
		font-family: monospace;
		font-size: 0.7rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mockup-field.highlighted .mockup-value {
		color: var(--t-1);
	}

	/* ─── Step 2: Waiting state ──────────────────────────────────────────── */

	.waiting-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
	}

	.spinner {
		font-size: 1.1rem;
		color: var(--acc);
		display: inline-block;
		animation: spin 1.2s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}

	.waiting-text {
		font-size: 0.85rem;
		color: var(--t-2);
	}

	/* ─── Input fields ───────────────────────────────────────────────────── */

	.import-card-fields {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.text-input {
		background: var(--bg-2);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.15s;
		min-width: 200px;
		max-width: 340px;
	}

	.text-input:focus {
		border-color: var(--b-3);
	}

	.text-input::placeholder {
		color: var(--t-3);
	}

	/* ─── Error message ──────────────────────────────────────────────────── */

	.error-message {
		font-size: 0.78rem;
		color: #ef4444;
		margin: 0;
		line-height: 1.4;
	}

	/* ─── Action buttons ─────────────────────────────────────────────────── */

	.import-card-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.import-btn {
		background: var(--bg-2);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		cursor: pointer;
		font-size: 0.8rem;
		white-space: nowrap;
		transition: border-color 0.15s, background 0.15s;
	}

	.import-btn:hover:not(:disabled) {
		border-color: var(--b-3);
	}

	.import-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.disconnect-btn {
		background: none;
		color: var(--t-3);
		border: 1px solid var(--b-1);
		padding: var(--space-xs) var(--space-sm);
		border-radius: 0;
		cursor: pointer;
		font-size: 0.8rem;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
	}

	.disconnect-btn:hover {
		color: #ef4444;
		border-color: #ef4444;
	}
</style>
