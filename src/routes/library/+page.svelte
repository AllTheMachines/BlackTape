<script lang="ts">
	import { libraryState, scanFolder, groupByAlbum, getSortedTracks } from '$lib/library';
	import { pickMusicFolder } from '$lib/library/scanner';
	import { loadLibrary } from '$lib/library/store.svelte';
	import { removeMusicFolder } from '$lib/library/scanner';
	import LibraryBrowser from '$lib/components/LibraryBrowser.svelte';
	import FolderManager from '$lib/components/FolderManager.svelte';
	import { isTauri } from '$lib/platform';
	import { onMount } from 'svelte';

	let tauriMode = $state(false);
	let showFolderManager = $state(false);

	onMount(() => {
		libraryState.sortBy = 'added';
		libraryState.sortAsc = false;
		tauriMode = isTauri();
	});

	async function handleAddFolder() {
		const path = await pickMusicFolder();
		if (path) {
			await scanFolder(path);
		}
	}

	async function handleRescan(path: string) {
		await scanFolder(path);
	}

	async function handleRemoveFolder(path: string) {
		await removeMusicFolder(path);
		await loadLibrary();
	}

	let albums = $derived(groupByAlbum(getSortedTracks()));
	let trackCount = $derived(libraryState.tracks.length);
	let hasLibrary = $derived(trackCount > 0);
	let hasFolders = $derived(libraryState.folders.length > 0);
	let progressPercent = $derived(
		libraryState.scanProgress
			? Math.round((libraryState.scanProgress.scanned / Math.max(libraryState.scanProgress.total, 1)) * 100)
			: 0
	);
</script>

<svelte:head>
	<title>Library</title>
</svelte:head>

{#if !tauriMode}
	<div class="desktop-only">
		<div class="desktop-only-icon">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
				<line x1="8" y1="21" x2="16" y2="21" />
				<line x1="12" y1="17" x2="12" y2="21" />
			</svg>
		</div>
		<h2>Library is available in the desktop app</h2>
		<p>The local music library requires the Mercury desktop application to scan and play your music files.</p>
	</div>
{:else}
	<div class="library-page">
		<!-- Header -->
		<div class="library-header">
			<div class="header-left">
				<h1>Library</h1>
				{#if hasLibrary}
					<span class="track-count">{trackCount} track{trackCount !== 1 ? 's' : ''}</span>
				{/if}
			</div>
			<div class="header-actions">
				{#if hasFolders}
					<button class="btn btn-secondary" onclick={() => (showFolderManager = !showFolderManager)} title="Manage folders">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="3" />
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
						</svg>
					</button>
				{/if}
				<button class="btn btn-primary" onclick={handleAddFolder}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
						<line x1="12" y1="11" x2="12" y2="17" />
						<line x1="9" y1="14" x2="15" y2="14" />
					</svg>
					Add Folder
				</button>
			</div>
		</div>

		<!-- Scan progress -->
		{#if libraryState.isScanning && libraryState.scanProgress}
			<div class="scan-progress">
				<div class="progress-bar">
					<div class="progress-fill" style="width: {progressPercent}%"></div>
				</div>
				<div class="progress-info">
					<span class="progress-count">{libraryState.scanProgress.scanned} / {libraryState.scanProgress.total}</span>
					<span class="progress-file">{libraryState.scanProgress.current_file.split('/').pop()}</span>
				</div>
			</div>
		{:else if libraryState.isScanning}
			<div class="scan-progress">
				<div class="progress-bar">
					<div class="progress-fill indeterminate"></div>
				</div>
				<div class="progress-info">
					<span class="progress-count">Scanning...</span>
				</div>
			</div>
		{/if}

		<!-- Folder Manager panel -->
		{#if showFolderManager}
			<FolderManager
				folders={libraryState.folders}
				onAddFolder={handleAddFolder}
				onRescan={handleRescan}
				onRemove={handleRemoveFolder}
				onClose={() => (showFolderManager = false)}
			/>
		{/if}

		<!-- Content -->
		{#if !hasLibrary && !hasFolders && !libraryState.isScanning}
			<div class="empty-state">
				<div class="empty-icon">
					<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
						<path d="M9 18V5l12-2v13" />
						<circle cx="6" cy="18" r="3" />
						<circle cx="18" cy="16" r="3" />
					</svg>
				</div>
				<h2>Add a music folder to get started</h2>
				<p>Point Mercury at your music collection and it will scan for audio files, read metadata, and build your library.</p>
				<button class="btn btn-primary btn-lg" onclick={handleAddFolder}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
						<line x1="12" y1="11" x2="12" y2="17" />
						<line x1="9" y1="14" x2="15" y2="14" />
					</svg>
					Choose Music Folder
				</button>
			</div>
		{:else if hasLibrary}
			<div class="library-content">
				<LibraryBrowser {albums} />
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Desktop-only message (web) */
	.desktop-only {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding: var(--space-xl);
		color: var(--t-2);
	}

	.desktop-only-icon {
		color: var(--t-3);
		margin-bottom: var(--space-lg);
	}

	.desktop-only h2 {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--t-1);
		margin: 0 0 var(--space-sm);
	}

	.desktop-only p {
		font-size: 0.85rem;
		margin: 0;
	}

	/* Library page layout */
	.library-page {
		padding: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	/* Header */
	.library-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 20px;
		border-bottom: 1px solid var(--b-1);
		background: var(--bg-2);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: var(--space-md);
	}

	.library-header h1 {
		font-size: 14px;
		font-weight: 500;
		color: var(--t-1);
		margin: 0;
	}

	.track-count {
		font-size: 0.8rem;
		color: var(--t-3);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 6px 12px;
		border: none;
		border-radius: var(--r);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.btn-primary {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
	}

	.btn-primary:hover {
		background: var(--bg-3);
		border-color: var(--b-3);
	}

	.btn-secondary {
		background: transparent;
		color: var(--t-2);
		border: 1px solid var(--b-1);
	}

	.btn-secondary:hover {
		color: var(--t-1);
		border-color: var(--b-2);
	}

	.btn-lg {
		padding: 10px 20px;
		font-size: 0.9rem;
	}

	/* Scan progress */
	.scan-progress {
		margin-bottom: var(--space-lg);
		padding: var(--space-md);
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: var(--r);
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--progress-bg);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--progress-color);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.progress-fill.indeterminate {
		width: 30%;
		animation: indeterminate 1.5s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-xs);
		font-size: 0.75rem;
		color: var(--t-2);
	}

	.progress-file {
		color: var(--t-3);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: right;
	}

	/* Library content fills remaining space */
	.library-content {
		flex: 1;
		overflow: hidden;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		text-align: center;
		padding: var(--space-xl);
	}

	.empty-icon {
		color: var(--t-3);
		margin-bottom: var(--space-lg);
		opacity: 0.5;
	}

	.empty-state h2 {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--t-1);
		margin: 0 0 var(--space-sm);
	}

	.empty-state p {
		font-size: 0.85rem;
		color: var(--t-2);
		margin: 0 0 var(--space-xl);
	}
</style>
