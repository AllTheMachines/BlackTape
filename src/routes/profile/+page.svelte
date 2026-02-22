<script lang="ts">
	import { onMount } from 'svelte';
	import { isTauri } from '$lib/platform';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import { collectionsState, loadCollections, createCollection } from '$lib/taste/collections.svelte';
	import { loadAvatarState, avatarState, saveAvatarMode } from '$lib/identity/avatar';
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

	onMount(async () => {
		tauriMode = isTauri();
		if (!tauriMode) return;

		const { invoke } = await import('@tauri-apps/api/core');
		handle = (await invoke<string | null>('get_identity_value', { key: 'handle' })) ?? '';
		await loadAvatarState(tasteProfile.tags);
		if (!collectionsState.isLoaded) await loadCollections();
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

		<!-- Taste Fingerprint Section -->
		<section class="fingerprint-section">
			<h2 class="section-title">Taste Fingerprint</h2>
			<p class="section-desc">A unique constellation of your musical taste. Export it to share.</p>
			<TasteFingerprint />
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
		padding: var(--spacing-xl);
		text-align: center;
		color: var(--text-muted);
	}
	.profile-page {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xl);
	}
	.identity-section {
		display: flex;
		gap: var(--spacing-md);
		align-items: flex-start;
	}
	.avatar-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
		flex-shrink: 0;
	}
	.edit-avatar-btn {
		font-size: 0.75rem;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}
	.handle-block { flex: 1; display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.handle-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
	.handle-input {
		font-size: 1.25rem;
		font-weight: 600;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		color: var(--text-primary);
		padding: 4px 0;
		outline: none;
		width: 100%;
	}
	.handle-input:focus { border-bottom-color: var(--accent); }
	.handle-hint { font-size: 0.75rem; color: var(--text-muted); }
	.section-title { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: var(--spacing-sm); }
	.section-desc { font-size: 0.85rem; color: var(--text-muted); margin-bottom: var(--spacing-sm); }
	.collections-header { display: flex; justify-content: space-between; align-items: center; }
	.new-shelf-btn {
		font-size: 0.8rem;
		padding: 4px 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 4px;
		cursor: pointer;
	}
	.new-shelf-row { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); align-items: center; }
	.new-shelf-input {
		flex: 1;
		padding: 4px 8px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 4px;
		font-size: 0.85rem;
	}
	.btn-sm { padding: 4px 10px; font-size: 0.8rem; border-radius: 4px; cursor: pointer; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); }
	.btn-cancel { color: var(--text-muted); }
	.shelf-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--spacing-xs); }
	.shelf-row { border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
	.shelf-toggle {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--bg-secondary);
		border: none;
		cursor: pointer;
		color: var(--text-primary);
		font-size: 0.9rem;
	}
	.shelf-toggle:hover { background: var(--bg-tertiary); }
	.shelf-toggle.expanded { background: var(--bg-tertiary); }
	.shelf-name { font-weight: 500; }
	.chevron { font-size: 0.7rem; color: var(--text-muted); }
	.loading-msg, .empty-msg { color: var(--text-muted); font-size: 0.875rem; }
	.avatar-tabs { display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-sm); }
	.tab-btn { padding: 4px 12px; border: 1px solid var(--border); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; border-radius: 4px; font-size: 0.8rem; }
	.tab-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
	.editor-section { border: 1px solid var(--border); border-radius: 6px; padding: var(--spacing-md); }
</style>
