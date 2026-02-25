<script lang="ts">
	import { onMount } from 'svelte';
	import { isTauri } from '$lib/platform';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import { collectionsState, loadCollections, createCollection } from '$lib/taste/collections.svelte';
	import { loadAvatarState, avatarState, saveAvatarMode } from '$lib/identity/avatar';
	import { ndkState } from '$lib/comms/nostr.svelte.js';
	import { publishTasteProfile } from '$lib/comms/taste-publish.js';
	import { exportPlayHistory } from '$lib/taste/history.js';
	import AvatarPreview from '$lib/components/AvatarPreview.svelte';
	import AvatarEditor from '$lib/components/AvatarEditor.svelte';
	import TasteFingerprint from '$lib/components/TasteFingerprint.svelte';
	import CollectionShelf from '$lib/components/CollectionShelf.svelte';

	let tauriMode = $state(false);
	let handle = $state('');
	let showAvatarEditor = $state(false);
	let expandedCollectionId = $state<string | null>(null);
	let newShelfName = $state('');
	let showNewShelf = $state(false);
	let nostrStatus = $state<'idle' | 'publishing' | 'published'>('idle');
	let exportStatus = $state('');

	onMount(async () => {
		tauriMode = isTauri();
		if (!tauriMode) return;

		const { invoke } = await import('@tauri-apps/api/core');
		handle = (await invoke<string | null>('get_identity_value', { key: 'handle' })) ?? '';
		await loadAvatarState(tasteProfile.tags);
		if (!collectionsState.isLoaded) await loadCollections();

		// Taste profile publishing — auto-publish if Nostr connected; silent skip if not
		nostrStatus = 'publishing';
		publishTasteProfile().then((result) => {
			nostrStatus = result === 'published' ? 'published' : 'idle';
		}).catch(() => {
			nostrStatus = 'idle'; // fail silently
		});
	});

	async function saveHandle() {
		if (!tauriMode) return;
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_identity_value', { key: 'handle', value: handle });
	}

	async function handleNewShelf() {
		const trimmed = newShelfName.trim();
		if (!trimmed) return;
		await createCollection(trimmed);
		newShelfName = '';
		showNewShelf = false;
	}

	function toggleCollection(id: string) {
		expandedCollectionId = expandedCollectionId === id ? null : id;
	}

	function handleAvatarSaved(_pixels: string[]) {
		showAvatarEditor = false;
	}

	async function handleExport() {
		exportStatus = 'Exporting…';
		try {
			await exportPlayHistory();
			exportStatus = 'Exported.';
		} catch (e) {
			exportStatus = 'Export failed.';
		}
		setTimeout(() => { exportStatus = ''; }, 3000);
	}
</script>

<svelte:head>
	<title>Profile — Mercury</title>
</svelte:head>

{#if !tauriMode}
	<div class="desktop-only">
		<p>Profile is available in the desktop app.</p>
	</div>
{:else}
	<main class="profile-page">

		<!-- Identity Section -->
		<section class="identity-section">
			<div class="avatar-block">
				<AvatarPreview size={96} />
				<button class="edit-avatar-btn" onclick={() => showAvatarEditor = !showAvatarEditor}>
					{showAvatarEditor ? 'Close Editor' : 'Edit Avatar'}
				</button>
			</div>

			<div class="handle-block">
				<label for="handle-input" class="handle-label">Handle</label>
				<input
					id="handle-input"
					class="handle-input"
					type="text"
					bind:value={handle}
					onblur={saveHandle}
					placeholder="Choose a handle..."
					maxlength="32"
				/>
				<p class="handle-hint">Your handle is local only — no account needed.</p>
			</div>
		</section>

		{#if showAvatarEditor}
			<section class="editor-section">
				<h2 class="section-title">Edit Avatar</h2>
				<div class="avatar-tabs">
					<button
						class="tab-btn"
						class:active={avatarState.mode === 'generative'}
						onclick={() => saveAvatarMode('generative')}
					>Generative</button>
					<button
						class="tab-btn"
						class:active={avatarState.mode === 'edited'}
						onclick={() => saveAvatarMode('edited')}
					>Custom Pixel Art</button>
				</div>
				{#if avatarState.mode === 'edited' || showAvatarEditor}
					<AvatarEditor onSave={handleAvatarSaved} />
				{/if}
			</section>
		{/if}

		<!-- Nostr Section -->
		{#if ndkState.pubkey}
			<section class="nostr-section-block">
				<div class="nostr-section">
					<span class="nostr-label">Nostr</span>
					<span class="nostr-pubkey">{ndkState.pubkey.slice(0, 8)}…{ndkState.pubkey.slice(-4)}</span>
					{#if nostrStatus === 'publishing'}
						<span class="nostr-status">Publishing…</span>
					{:else if nostrStatus === 'published'}
						<span class="nostr-status published">Published</span>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Taste Fingerprint Section -->
		<section class="fingerprint-section">
			<h2 class="section-title">Taste Fingerprint</h2>
			<p class="section-desc">A unique constellation of your musical taste. Export it to share.</p>
			<TasteFingerprint />
			<div class="export-row">
				<button class="export-btn" onclick={handleExport}>Export Play History</button>
				{#if exportStatus}
					<span class="export-status">{exportStatus}</span>
				{/if}
			</div>
		</section>

		<!-- Collections Section -->
		<section class="collections-section">
			<div class="collections-header">
				<h2 class="section-title">Shelves</h2>
				<button class="new-shelf-btn" onclick={() => showNewShelf = !showNewShelf}>
					+ New Shelf
				</button>
			</div>

			{#if showNewShelf}
				<div class="new-shelf-row">
					<input
						class="new-shelf-input"
						type="text"
						bind:value={newShelfName}
						placeholder="Shelf name..."
						onkeydown={(e) => e.key === 'Enter' && handleNewShelf()}
						maxlength="50"
					/>
					<button class="btn-sm" onclick={handleNewShelf}>Create</button>
					<button class="btn-sm btn-cancel" onclick={() => { showNewShelf = false; newShelfName = ''; }}>Cancel</button>
				</div>
			{/if}

			{#if !collectionsState.isLoaded}
				<p class="loading-msg">Loading shelves...</p>
			{:else if collectionsState.collections.length === 0}
				<p class="empty-msg">No shelves yet. Create one above, then save artists or releases to it.</p>
			{:else}
				<ul class="shelf-list">
					{#each collectionsState.collections as col (col.id)}
						<li class="shelf-row">
							<button
								class="shelf-toggle"
								class:expanded={expandedCollectionId === col.id}
								onclick={() => toggleCollection(col.id)}
							>
								<span class="shelf-name">{col.name}</span>
								<span class="chevron">{expandedCollectionId === col.id ? '▲' : '▼'}</span>
							</button>
							{#if expandedCollectionId === col.id}
								<CollectionShelf collectionId={col.id} collectionName={col.name} />
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

	</main>
{/if}

<style>
	.desktop-only {
		padding: 20px;
		text-align: center;
		color: var(--t-3);
	}
	.profile-page {
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}
	.identity-section {
		display: flex;
		gap: var(--space-md);
		align-items: flex-start;
	}
	.avatar-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		flex-shrink: 0;
	}
	.edit-avatar-btn {
		font-size: 0.75rem;
		color: var(--t-3);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}
	.handle-block { flex: 1; display: flex; flex-direction: column; gap: var(--space-xs); }
	.handle-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--t-3); }
	.handle-input {
		font-size: 1.25rem;
		font-weight: 600;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--b-2);
		color: var(--t-1);
		padding: 4px 0;
		outline: none;
		width: 100%;
	}
	.handle-input:focus { border-bottom-color: var(--acc); }
	.handle-hint { font-size: 0.75rem; color: var(--t-3); }
	.section-title { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--t-3); margin-bottom: var(--space-sm); }
	.section-desc { font-size: 0.85rem; color: var(--t-3); margin-bottom: var(--space-sm); }
	.collections-header { display: flex; justify-content: space-between; align-items: center; }
	.new-shelf-btn {
		font-size: 0.8rem;
		padding: 4px 10px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		color: var(--t-1);
		border-radius: 4px;
		cursor: pointer;
	}
	.new-shelf-row { display: flex; gap: var(--space-xs); margin-bottom: var(--space-sm); align-items: center; }
	.new-shelf-input {
		flex: 1;
		padding: 4px 8px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		color: var(--t-1);
		border-radius: 4px;
		font-size: 0.85rem;
	}
	.btn-sm { padding: 4px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; border: 1px solid var(--b-2); background: var(--bg-3); color: var(--t-1); }
	.btn-cancel { color: var(--t-3); }
	.shelf-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-xs); }
	.shelf-row { border: 1px solid var(--b-2); border-radius: 4px; overflow: hidden; }
	.shelf-toggle {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-3);
		border: none;
		cursor: pointer;
		color: var(--t-1);
		font-size: 0.9rem;
	}
	.shelf-toggle:hover { background: var(--bg-4); }
	.shelf-toggle.expanded { background: var(--bg-4); }
	.shelf-name { font-weight: 500; }
	.chevron { font-size: 0.7rem; color: var(--t-3); }
	.loading-msg, .empty-msg { color: var(--t-3); font-size: 0.875rem; }
	.avatar-tabs { display: flex; gap: var(--space-xs); margin-bottom: var(--space-sm); }
	.tab-btn { padding: 4px 12px; border: 1px solid var(--b-2); background: var(--bg-3); color: var(--t-1); cursor: pointer; border-radius: 4px; font-size: 0.8rem; }
	.tab-btn.active { background: var(--acc); border-color: var(--acc); color: #fff; }
	.editor-section { border: 1px solid var(--b-2); border-radius: 6px; padding: var(--space-md); }
	.nostr-section-block { padding: var(--space-xs) 0; }
	.nostr-section { display: flex; align-items: center; gap: var(--space-sm); font-size: 0.78rem; color: var(--t-3); }
	.nostr-label { text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.7rem; opacity: 0.7; }
	.nostr-pubkey { font-family: monospace; opacity: 0.8; }
	.nostr-status { font-size: 0.72rem; opacity: 0.8; }
	.nostr-status.published { color: var(--acc); opacity: 1; }
	.export-row { display: flex; align-items: center; gap: var(--space-sm); margin-top: var(--space-sm); }
	.export-btn { padding: 4px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; border: 1px solid var(--b-2); background: var(--bg-3); color: var(--t-1); }
	.export-btn:hover { background: var(--bg-4); }
	.export-status { font-size: 0.78rem; color: var(--t-3); }
</style>
