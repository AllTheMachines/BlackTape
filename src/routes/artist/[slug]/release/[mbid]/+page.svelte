<script lang="ts">
	import { onMount } from 'svelte';
	import { PROJECT_NAME } from '$lib/config';
	import BuyOnBar from '$lib/components/BuyOnBar.svelte';
	import LinerNotes from '$lib/components/LinerNotes.svelte';
	import { isTauri } from '$lib/platform';
	import type { ReleaseDetail } from './+page.server';

	let { data } = $props();

	let release = $derived(data.release as ReleaseDetail | null);

	/** Format milliseconds as M:SS */
	function formatDuration(ms: number | null): string {
		if (!ms) return '';
		const totalSec = Math.round(ms / 1000);
		const m = Math.floor(totalSec / 60);
		const s = totalSec % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	let coverError = $state(false);
	let tauriMode = $state(false);

	/** Save to Shelf state (Tauri-only) */
	let savedInCollections = $state<string[]>([]);
	let showSaveDropdown = $state(false);
	let newShelfNameRelease = $state('');
	let shelfCollections = $state<Array<{ id: string; name: string }>>([]);

	let pageTitle = $derived(
		release ? `${release.title} — ${release.artistName} — ${PROJECT_NAME}` : PROJECT_NAME
	);

	onMount(() => {
		tauriMode = isTauri();
		if (!tauriMode) return;

		(async () => {
			const { loadCollections, collectionsState, isInAnyCollection } = await import('$lib/taste/collections.svelte');
			if (!collectionsState.isLoaded) await loadCollections();
			shelfCollections = collectionsState.collections;
			savedInCollections = await isInAnyCollection('release', data.mbid);
		})();
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	{#if release}
		<meta name="description" content="{release.title} by {release.artistName}{release.year ? ` (${release.year})` : ''}" />
	{/if}
</svelte:head>

<div class="release-page">

	{#if !release}
		<div class="release-loading">
			<p>Loading release details…</p>
		</div>
	{:else}

		<!-- Hero -->
		<header class="release-hero">
			<div class="cover-art">
				{#if !coverError}
					<img
						src={release.coverArtUrl}
						alt="{release.title} cover art"
						onerror={() => coverError = true}
					/>
				{:else}
					<div class="cover-placeholder">
						<span>{release.title.charAt(0).toUpperCase()}</span>
					</div>
				{/if}
			</div>

			<div class="hero-info">
				<div class="release-meta-badges">
					{#if release.year}
						<span class="year">{release.year}</span>
					{/if}
					{#if release.type && release.type !== 'Release'}
						<span class="type-badge">{release.type}</span>
					{/if}
				</div>

				<h1 class="release-title">{release.title}</h1>

				<a href="/artist/{release.artistSlug}" class="artist-link">
					{release.artistName}
				</a>

				<!-- Buy On row — always shown -->
				<div class="action-rows">
					<BuyOnBar links={release.buyLinks} />
					{#if tauriMode}
						<div class="save-shelf-wrapper" style="position:relative; margin-top: 8px;">
							<button
								class="save-shelf-btn"
								class:saved={savedInCollections.length > 0}
								onclick={() => showSaveDropdown = !showSaveDropdown}
								aria-label="Save to shelf"
							>
								{savedInCollections.length > 0 ? '✓ Saved' : '+ Save to Shelf'}
							</button>
							{#if showSaveDropdown}
								<div class="shelf-dropdown">
									{#each shelfCollections as col (col.id)}
										<button
											class="shelf-option"
											class:in-collection={savedInCollections.includes(col.id)}
											onclick={async () => {
												const { addToCollection } = await import('$lib/taste/collections.svelte');
												await addToCollection(col.id, 'release', data.mbid, release?.title ?? data.mbid, data.slug);
												savedInCollections = [...savedInCollections, col.id];
												showSaveDropdown = false;
											}}
										>
											{col.name} {savedInCollections.includes(col.id) ? '✓' : ''}
										</button>
									{/each}
									<div class="new-shelf-inline">
										<input
											class="new-shelf-input-sm"
											type="text"
											bind:value={newShelfNameRelease}
											placeholder="New shelf..."
											onkeydown={async (e) => {
												if (e.key === 'Enter' && newShelfNameRelease.trim()) {
													const { createCollection, addToCollection, collectionsState } = await import('$lib/taste/collections.svelte');
													const id = await createCollection(newShelfNameRelease.trim());
													if (id) {
														await addToCollection(id, 'release', data.mbid, release?.title ?? data.mbid, data.slug);
														savedInCollections = [...savedInCollections, id];
														shelfCollections = collectionsState.collections;
													}
													newShelfNameRelease = '';
													showSaveDropdown = false;
												}
											}}
										/>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</header>

		<!-- Tracklist -->
		{#if release.tracks.length > 0}
			<section class="tracklist">
				<h2 class="section-title">Tracklist</h2>
				<ol class="tracks">
					{#each release.tracks as track (track.position)}
						<li class="track">
							<span class="track-num">{track.number}</span>
							<span class="track-title">{track.title}</span>
							{#if track.length}
								<span class="track-duration">{formatDuration(track.length)}</span>
							{/if}
						</li>
					{/each}
				</ol>
			</section>
		{:else}
			<section class="tracklist">
				<p class="no-tracks">Tracklist not available from MusicBrainz for this release.</p>
			</section>
		{/if}

		<!-- Credits / Personnel -->
		{#if release.credits.length > 0}
			<section class="credits">
				<h2 class="section-title">Credits</h2>
				<ul class="credits-list">
					{#each release.credits as credit (credit.name + credit.role)}
						<li class="credit-item">
							<span class="credit-name">{credit.name}</span>
							<span class="credit-role">{credit.role}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Liner Notes — expandable credits panel, lazy-fetches MusicBrainz on open -->
		<LinerNotes releaseMbid={data.mbid} />

	{/if}
</div>

<style>
	.release-page {
		max-width: 860px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.release-loading {
		text-align: center;
		padding: var(--space-xl);
		color: var(--text-muted);
	}

	/* Hero */
	.release-hero {
		display: flex;
		gap: var(--space-xl);
		margin-bottom: var(--space-xl);
		align-items: flex-start;
	}

	.cover-art {
		width: 220px;
		height: 220px;
		flex-shrink: 0;
		border-radius: var(--card-radius);
		overflow: hidden;
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
	}

	.cover-art img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.cover-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-elevated);
	}

	.cover-placeholder span {
		font-size: 4rem;
		font-weight: 200;
		color: var(--text-muted);
	}

	.hero-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding-top: var(--space-xs);
	}

	.release-meta-badges {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.year {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.type-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 3px;
		background: var(--bg-elevated);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.release-title {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--text-primary);
		line-height: 1.2;
		margin: 0;
	}

	.artist-link {
		font-size: 1rem;
		color: var(--text-secondary);
		text-decoration: none;
		transition: color 0.15s;
	}

	.artist-link:hover {
		color: var(--text-primary);
	}

	.action-rows {
		margin-top: var(--space-md);
	}

	/* Tracklist */
	.tracklist {
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin-bottom: var(--space-md);
	}

	.tracks {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--border-subtle);
	}

	.track {
		display: grid;
		grid-template-columns: 2.5rem 1fr auto;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.track-num {
		font-size: 0.8rem;
		color: var(--text-muted);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.track-title {
		font-size: 0.9rem;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.track-duration {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.no-tracks {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-style: italic;
	}

	/* Credits */
	.credits {
		margin-bottom: var(--space-xl);
	}

	.credits-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.credit-item {
		display: flex;
		gap: var(--space-md);
		font-size: 0.85rem;
	}

	.credit-name {
		color: var(--text-primary);
		min-width: 160px;
	}

	.credit-role {
		color: var(--text-muted);
		text-transform: capitalize;
	}

	/* ── Save to Shelf ──────────────────────────────────── */
	.save-shelf-wrapper { display: inline-block; }
	.save-shelf-btn {
		padding: 4px 10px;
		font-size: 0.8rem;
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		color: var(--text-primary);
		border-radius: 4px;
		cursor: pointer;
	}
	.save-shelf-btn.saved { border-color: var(--accent); color: var(--accent); }
	.shelf-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		z-index: 50;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 4px;
		min-width: 160px;
		padding: 4px 0;
		box-shadow: 0 4px 12px rgba(0,0,0,0.3);
	}
	.shelf-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 6px 12px;
		background: none;
		border: none;
		color: var(--text-primary);
		font-size: 0.85rem;
		cursor: pointer;
	}
	.shelf-option:hover { background: var(--bg-tertiary); }
	.shelf-option.in-collection { color: var(--accent); }
	.new-shelf-inline { padding: 4px 8px; border-top: 1px solid var(--border); }
	.new-shelf-input-sm {
		width: 100%;
		padding: 4px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 3px;
		font-size: 0.8rem;
	}

	/* Mobile */
	@media (max-width: 600px) {
		.release-hero {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.cover-art {
			width: 180px;
			height: 180px;
		}

		.hero-info {
			align-items: center;
		}

		.release-meta-badges {
			justify-content: center;
		}

		.action-rows {
			width: 100%;
		}
	}
</style>
