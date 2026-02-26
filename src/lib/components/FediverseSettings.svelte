<script lang="ts">
	import { onMount } from 'svelte';

	let apHandle = $state('');
	let apDisplayName = $state('');
	let apHostingUrl = $state('');
	let exportStatus = $state('');
	let isExporting = $state(false);

	let handlePreview = $derived((() => {
		if (!apHandle.trim() || !apHostingUrl.trim()) return '';
		try {
			const hostname = new URL(apHostingUrl.trim()).hostname;
			return `@${apHandle.trim()}@${hostname}`;
		} catch {
			return '';
		}
	})());

	let canExport = $derived(
		apHandle.trim().length > 0 &&
		apDisplayName.trim().length > 0 &&
		apHostingUrl.trim().length > 0 &&
		!isExporting
	);

	let deployPaths = $derived((() => {
		const base = apHostingUrl.trim().replace(/\/$/, '');
		if (!base) return null;
		return {
			actor: `${base}/ap/actor.json`,
			outbox: `${base}/ap/outbox.json`,
			webfinger: `${base}/.well-known/webfinger`,
		};
	})());

	onMount(async () => {
		const { invoke } = await import('@tauri-apps/api/core');
		apHandle = (await invoke<string | null>('get_identity_value', { key: 'ap_handle' })) ?? '';
		apDisplayName = (await invoke<string | null>('get_identity_value', { key: 'ap_display_name' })) ?? '';
		apHostingUrl = (await invoke<string | null>('get_identity_value', { key: 'ap_hosting_url' })) ?? '';
	});

	async function saveHandle() {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_identity_value', { key: 'ap_handle', value: apHandle });
	}

	async function saveDisplayName() {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_identity_value', { key: 'ap_display_name', value: apDisplayName });
	}

	async function saveHostingUrl() {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_identity_value', { key: 'ap_hosting_url', value: apHostingUrl });
	}

	async function handleExport() {
		if (!canExport) return;
		isExporting = true;
		exportStatus = '';
		try {
			const { open } = await import('@tauri-apps/plugin-dialog');
			const selected = await open({ directory: true, multiple: false, title: 'Choose export folder' });
			if (!selected) { isExporting = false; return; }

			const { invoke } = await import('@tauri-apps/api/core');
			await invoke('export_activitypub', {
				outputDir: selected,
				identity: {
					handle: apHandle.trim(),
					display_name: apDisplayName.trim(),
					hosting_url: apHostingUrl.trim().replace(/\/$/, ''),
				}
			});
			exportStatus = `Exported 3 files to ${selected}`;
		} catch (e) {
			exportStatus = `Export failed: ${e}`;
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="settings-section" data-testid="fediverse-settings">
	<h2>Fediverse (ActivityPub)</h2>
	<p class="section-desc">Export static files that make your BlackTape curation followable from Mastodon and other Fediverse apps.</p>

	<!-- Identity form -->
	<div class="ap-form">
		<label class="ap-label">
			Handle (username)
			<input
				type="text"
				bind:value={apHandle}
				onblur={saveHandle}
				placeholder="yourname"
				data-testid="ap-handle-input"
				class="ap-input"
			/>
		</label>
		{#if handlePreview}
			<span class="handle-preview" data-testid="ap-handle-preview">{handlePreview}</span>
		{/if}

		<label class="ap-label">
			Display name
			<input
				type="text"
				bind:value={apDisplayName}
				onblur={saveDisplayName}
				placeholder="Your Name"
				data-testid="ap-display-name-input"
				class="ap-input"
			/>
		</label>

		<label class="ap-label">
			Hosting URL
			<input
				type="text"
				bind:value={apHostingUrl}
				onblur={saveHostingUrl}
				placeholder="https://yourdomain.com"
				data-testid="ap-hosting-url-input"
				class="ap-input"
			/>
		</label>
	</div>

	<!-- Export button -->
	<button
		class="ap-export-btn"
		onclick={handleExport}
		disabled={!canExport}
		title={!canExport && !isExporting ? 'Fill in all three fields to export' : ''}
		data-testid="ap-export-btn"
	>
		{isExporting ? 'Exporting...' : 'Export ActivityPub files'}
	</button>

	{#if exportStatus}
		<span class="import-status" data-testid="ap-export-status">{exportStatus}</span>
	{/if}

	<!-- Deploy paths block -->
	{#if deployPaths}
		<div class="ap-paths" data-testid="ap-deploy-paths">
			<p class="sub-section-label">Upload these files to your static host:</p>
			<ul class="ap-path-list">
				<li><code>{deployPaths.actor}</code></li>
				<li><code>{deployPaths.outbox}</code></li>
				<li><code>{deployPaths.webfinger}</code> <span class="path-note">(rename to "webfinger" — no .json extension)</span></li>
			</ul>
		</div>
	{/if}

	<!-- Inline help block -->
	<div class="ap-help" data-testid="ap-help-block">
		<p>Upload the exported files to any static host at the paths shown above. The WebFinger file must be served with <code>Content-Type: application/jrd+json</code> — check your host's documentation for custom Content-Type configuration.</p>
		<p>To verify: search <code>{handlePreview || '@handle@yourdomain.com'}</code> on Mastodon. The actor profile should appear and be followable. (The follow will show as "pending" until a future version adds live inbox support.)</p>
	</div>
</div>

<style>
	.ap-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-bottom: 16px;
	}

	.ap-label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 0.8rem;
		color: var(--text-secondary, #a0a0a0);
	}

	.ap-input {
		background: var(--bg-elevated, #2a2a2a);
		color: var(--text-primary, #e0e0e0);
		border: 1px solid var(--border-default, #3a3a3a);
		padding: 6px 10px;
		border-radius: var(--input-radius, 4px);
		font-size: 0.85rem;
		outline: none;
		transition: border-color 0.15s;
		max-width: 360px;
	}

	.ap-input:focus {
		border-color: var(--border-hover, #555);
	}

	.ap-input::placeholder {
		color: var(--text-muted, #666);
	}

	.handle-preview {
		font-size: 0.85rem;
		color: var(--link-color, #8b5cf6);
		font-weight: 500;
		padding: 4px 0;
	}

	.ap-export-btn {
		background: var(--bg-hover, #2e2e2e);
		color: var(--text-primary, #e0e0e0);
		border: 1px solid var(--border-default, #3a3a3a);
		padding: 8px 16px;
		border-radius: var(--input-radius, 4px);
		cursor: pointer;
		font-size: 0.85rem;
		transition: border-color 0.15s, background 0.15s;
		margin-bottom: 8px;
	}

	.ap-export-btn:hover:not(:disabled) {
		border-color: var(--border-hover, #555);
		background: var(--bg-elevated, #2a2a2a);
	}

	.ap-export-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.ap-paths {
		background: var(--bg-elevated, #2a2a2a);
		border: 1px solid var(--border-subtle, #2a2a2a);
		border-radius: var(--card-radius, 6px);
		padding: 12px 16px;
		margin-top: 16px;
	}

	.ap-path-list {
		list-style: none;
		padding: 0;
		margin: 8px 0 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.ap-path-list li {
		font-size: 0.78rem;
		color: var(--text-secondary, #a0a0a0);
	}

	.ap-path-list code {
		font-size: 0.75rem;
		background: var(--bg-hover, #2e2e2e);
		padding: 2px 6px;
		border-radius: 3px;
		color: var(--text-primary, #e0e0e0);
		word-break: break-all;
	}

	.path-note {
		font-size: 0.72rem;
		color: var(--text-muted, #666);
		font-style: italic;
	}

	.ap-help {
		margin-top: 16px;
		padding: 12px 16px;
		background: var(--bg-elevated, #2a2a2a);
		border: 1px solid var(--border-subtle, #2a2a2a);
		border-radius: var(--card-radius, 6px);
	}

	.ap-help p {
		font-size: 0.78rem;
		color: var(--text-muted, #666);
		line-height: 1.55;
		margin: 0 0 8px;
	}

	.ap-help p:last-child {
		margin-bottom: 0;
	}

	.ap-help code {
		font-size: 0.75rem;
		background: var(--bg-hover, #2e2e2e);
		padding: 1px 4px;
		border-radius: 3px;
		color: var(--text-secondary, #a0a0a0);
	}
</style>
