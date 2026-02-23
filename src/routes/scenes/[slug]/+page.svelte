<script lang="ts">
	import { onMount } from 'svelte';
	import { isTauri } from '$lib/platform';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';

	let { data }: { data: PageData } = $props();

	// AI description — effectiveBio pattern: null by default, filled async after render
	let aiDescription = $state<string | null>(null);
	let aiLoading = $state(false);

	onMount(async () => {
		if (!isTauri() || !data.scene) return;
		try {
			// Check AI is enabled before attempting
			const { aiState } = await import('$lib/ai/state.svelte');
			if (!aiState.enabled) return;

			aiLoading = true;
			const { getAiProvider } = await import('$lib/ai/engine');
			const { PROMPTS } = await import('$lib/ai/prompts');
			const ai = getAiProvider();
			if (!ai) return;

			const artistNames = data.artists.map(a => a.name);
			const prompt = PROMPTS.sceneDescription(data.scene.name, data.scene.tags, artistNames);
			aiDescription = await ai.complete(prompt, { temperature: 0.7, maxTokens: 60 });
		} catch {
			/* best-effort — no AI, no problem */
		} finally {
			aiLoading = false;
		}
	});
</script>

<svelte:head>
	<title>{data.scene?.name ?? 'Scene'} — {PROJECT_NAME}</title>
</svelte:head>

{#if !data.scene}
	<div class="not-found">
		<h1>Scene not found</h1>
		<p><a href="/scenes">Back to Scenes</a></p>
	</div>
{:else}
	<div class="scene-page">
		<!-- 1. Header block -->
		<div class="scene-header">
			<span class="scene-type-label">scene</span>
			<h1 class="scene-name">{data.scene.name}</h1>
			<div class="scene-meta">
				{#if data.scene.listenerCount > 0}
					<span class="listener-badge">
						{data.scene.listenerCount} listener{data.scene.listenerCount === 1 ? '' : 's'}
					</span>
				{:else}
					<span class="listener-badge emerging-count">Emerging scene</span>
				{/if}
				{#if data.scene.isEmerging}
					<span class="emerging-chip">Emerging</span>
				{/if}
			</div>
		</div>

		<!-- AI description slot (effectiveBio pattern) — Tauri + AI only -->
		{#if aiDescription}
			<div class="ai-description">
				<p>{aiDescription}</p>
				<span class="source-badge">AI</span>
			</div>
		{/if}

		<!-- 2. Tags block -->
		{#if data.scene.tags.length > 0}
			<div class="tags-block">
				{#each data.scene.tags as tag}
					<a href="/discover?tags={encodeURIComponent(tag)}" class="tag-chip">{tag}</a>
				{/each}
			</div>
		{/if}

		<!-- 3. Artists block -->
		<section class="scene-section">
			<h2>Artists in this scene</h2>
			{#if data.artists.length === 0}
				<p class="empty-artists">No artists loaded yet.</p>
			{:else}
				<ul class="artists-list">
					{#each data.artists as artist}
						<li class="artist-item">
							<a href="/artist/{artist.slug}" class="artist-link">{artist.name}</a>
							{#if artist.country}
								<span class="artist-country">{artist.country}</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- 4. Top Tracks block — omitted entirely when empty (locked decision: CONTEXT.md line 18) -->
		{#if data.topTracks.length > 0}
			<section class="scene-section">
				<h2>Top Tracks</h2>
				<ol class="tracks-list">
					{#each data.topTracks as track}
						<li class="track-item">
							<span class="track-title">{track.title}</span>
							<span class="track-sep">—</span>
							<a href="/artist/{track.artistSlug}" class="track-artist">{track.artistName}</a>
						</li>
					{/each}
				</ol>
			</section>
		{/if}

		<div class="back-link">
			<a href="/scenes">&larr; All Scenes</a>
		</div>
	</div>
{/if}

<style>
	.not-found {
		max-width: 600px;
		margin: 4rem auto;
		text-align: center;
		padding: var(--space-xl);
	}

	.not-found h1 {
		font-size: 1.5rem;
		margin-bottom: var(--space-md);
	}

	.not-found a {
		color: var(--text-accent);
	}

	.scene-page {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-lg);
	}

	.scene-header {
		margin-bottom: var(--space-lg);
	}

	.scene-type-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		display: block;
		margin-bottom: var(--space-xs);
	}

	.scene-name {
		font-size: 2rem;
		font-weight: 700;
		margin: 0 0 var(--space-sm);
		color: var(--text-primary);
	}

	.scene-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.listener-badge {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.emerging-count {
		color: var(--text-muted);
		font-style: italic;
	}

	.emerging-chip {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent, #60a5fa);
		border: 1px solid var(--accent, #60a5fa);
		border-radius: 999px;
		padding: 2px 8px;
	}

	.ai-description {
		position: relative;
		padding: var(--space-md);
		background: var(--bg-surface);
		border-radius: 8px;
		margin-bottom: var(--space-lg);
		border-left: 3px solid var(--accent, #60a5fa);
	}

	.ai-description p {
		margin: 0;
		font-style: italic;
		color: var(--text-secondary);
		font-size: 0.95rem;
	}

	.source-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		color: var(--text-muted);
		letter-spacing: 0.1em;
		display: block;
		margin-top: var(--space-xs);
	}

	.tags-block {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-xl);
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		padding: 2px var(--space-sm);
		background: var(--tag-bg);
		color: var(--tag-text);
		border: 1px solid var(--tag-border);
		border-radius: 999px;
		font-size: 0.8rem;
		text-decoration: none;
		transition:
			background 0.15s,
			border-color 0.15s;
		white-space: nowrap;
	}

	.tag-chip:hover {
		background: #1f2d42;
		border-color: #3a4f6a;
	}

	.scene-section {
		margin-bottom: var(--space-2xl);
	}

	.scene-section h2 {
		font-size: 1.1rem;
		font-weight: 600;
		margin-bottom: var(--space-md);
		color: var(--text-primary);
	}

	.empty-artists {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.artists-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.artist-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-sm);
	}

	.artist-link {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-accent);
		text-decoration: none;
	}

	.artist-link:hover {
		text-decoration: underline;
	}

	.artist-country {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.tracks-list {
		padding: 0 0 0 var(--space-lg);
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.track-item {
		font-size: 0.9rem;
		display: flex;
		align-items: baseline;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.track-title {
		color: var(--text-primary);
	}

	.track-sep {
		color: var(--text-muted);
	}

	.track-artist {
		color: var(--text-accent);
		text-decoration: none;
		font-size: 0.85rem;
	}

	.track-artist:hover {
		text-decoration: underline;
	}

	.back-link {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--border-subtle);
	}

	.back-link a {
		font-size: 0.85rem;
		color: var(--text-muted);
		text-decoration: none;
	}

	.back-link a:hover {
		color: var(--text-accent);
	}
</style>
