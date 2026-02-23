<script lang="ts">
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';
	import RssButton from '$lib/components/RssButton.svelte';

	let { data }: { data: PageData } = $props();

	type ArtistRow = {
		id: number;
		mbid: string;
		name: string;
		slug: string;
		country: string | null;
		begin_year: number | null;
		tags: string | null;
	};

	// Active tab: 'new' | 'traction' | 'curator'
	// Default to 'curator' if a curator handle is present in the URL
	let activeView = $state<'new' | 'traction' | 'curator'>(
		data.curatorHandle ? 'curator' : 'new'
	);

	function parseTags(tags: string | null): string[] {
		if (!tags) return [];
		return tags.split(', ').filter(Boolean).slice(0, 4);
	}
</script>

<svelte:head>
	<title>New & Rising — {PROJECT_NAME}</title>
</svelte:head>

<div class="new-rising-page">
	<div class="page-header">
		<div class="header-title-row">
			<div>
				<h1 class="page-title">New & Rising</h1>
				<p class="page-desc">Artists worth hearing about right now</p>
			</div>
			<RssButton href="/api/rss/new-rising" label="New & Rising RSS feed" />
		</div>
	</div>

	<!-- Tab row -->
	<nav class="tab-row" aria-label="New & Rising views">
		<button
			class="tab-btn"
			class:active={activeView === 'new'}
			onclick={() => activeView = 'new'}
		>
			Newly Active
		</button>
		<button
			class="tab-btn"
			class:active={activeView === 'traction'}
			onclick={() => activeView = 'traction'}
		>
			Gaining Traction
		</button>
		{#if data.curatorHandle}
			<button
				class="tab-btn curator-tab"
				class:active={activeView === 'curator'}
				onclick={() => activeView = 'curator'}
			>
				By @{data.curatorHandle}
			</button>
		{/if}
	</nav>

	<!-- Newly Active view -->
	{#if activeView === 'new'}
		{#if data.newArtists.length === 0}
			<div class="empty-state">
				<p>No artists found — check back as the index grows.</p>
			</div>
		{:else}
			<div class="artist-grid">
				{#each data.newArtists as artist (artist.id)}
					<a href="/artist/{artist.slug}" class="artist-card">
						<span class="artist-name">{artist.name}</span>
						{#if artist.begin_year}
							<span class="artist-year">{artist.begin_year}</span>
						{/if}
						{#if artist.country}
							<span class="artist-country">{artist.country}</span>
						{/if}
						{#if parseTags(artist.tags).length > 0}
							<span class="artist-tags">{parseTags(artist.tags).join(', ')}</span>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
		<p class="view-note">Artists active since {data.currentYear - 1}, ordered by most recent first.</p>
	{/if}

	<!-- Gaining Traction view -->
	{#if activeView === 'traction'}
		{#if data.gainingTraction.length === 0}
			<div class="empty-state">
				<p>No artists found — check back as the index grows.</p>
			</div>
		{:else}
			<div class="artist-grid">
				{#each data.gainingTraction as artist (artist.id)}
					<a href="/artist/{artist.slug}" class="artist-card">
						<span class="artist-name">{artist.name}</span>
						{#if artist.begin_year}
							<span class="artist-year">{artist.begin_year}</span>
						{/if}
						{#if artist.country}
							<span class="artist-country">{artist.country}</span>
						{/if}
						{#if parseTags(artist.tags).length > 0}
							<span class="artist-tags">{parseTags(artist.tags).join(', ')}</span>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
		<p class="view-note">Artists active since {data.currentYear - 1}, ordered by tag niche score.</p>
	{/if}

	<!-- Curator view -->
	{#if activeView === 'curator' && data.curatorHandle}
		{#if data.curatorArtists.length === 0}
			<div class="empty-state">
				<p>No artists featured by @{data.curatorHandle} yet.</p>
			</div>
		{:else}
			<div class="artist-grid">
				{#each data.curatorArtists as artist (artist.id)}
					<a href="/artist/{artist.slug}" class="artist-card">
						<span class="artist-name">{artist.name}</span>
						{#if artist.begin_year}
							<span class="artist-year">{artist.begin_year}</span>
						{/if}
						{#if artist.country}
							<span class="artist-country">{artist.country}</span>
						{/if}
						{#if parseTags(artist.tags).length > 0}
							<span class="artist-tags">{parseTags(artist.tags).join(', ')}</span>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
		<p class="view-note">Artists featured by @{data.curatorHandle}.</p>
	{/if}
</div>

<style>
	.new-rising-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.page-header {
		margin-bottom: var(--space-lg);
	}

	.header-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-md);
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.page-desc {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.tab-row {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-lg);
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: var(--space-xs);
	}

	.tab-btn {
		padding: 6px 14px;
		font-size: 0.8rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 999px;
		color: var(--text-muted);
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.tab-btn:hover {
		color: var(--text-secondary);
	}

	.tab-btn.active {
		color: var(--text-accent);
		border-color: var(--text-accent);
	}

	.curator-tab {
		font-style: italic;
	}

	.artist-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	@media (max-width: 600px) {
		.artist-grid {
			grid-template-columns: 1fr;
		}
	}

	.artist-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: var(--space-md);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		text-decoration: none;
		transition: border-color 0.15s, background 0.15s;
	}

	.artist-card:hover {
		border-color: var(--border-default);
		background: var(--bg-elevated);
		text-decoration: none;
	}

	.artist-name {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.artist-year {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.artist-country {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-variant: small-caps;
	}

	.artist-tags {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: 2px;
		line-height: 1.4;
	}

	.empty-state {
		padding: var(--space-2xl) var(--space-lg);
		text-align: center;
		color: var(--text-muted);
		font-size: 0.9rem;
		max-width: 480px;
		margin: 0 auto var(--space-lg);
	}

	.view-note {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-style: italic;
		margin: var(--space-md) 0 0;
	}
</style>
