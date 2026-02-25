<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isTauri } from '$lib/platform';
	import type { PageData } from './$types';
	import { PROJECT_NAME } from '$lib/config';
	import { followScene, unfollowScene, sceneFollowState, loadSceneFollows } from '$lib/comms/scenes.svelte.js';
	import { checkActiveRoom, openRoom } from '$lib/comms/listening-room.svelte.js';

	let { data }: { data: PageData } = $props();

	// AI description — effectiveBio pattern: null by default, filled async after render
	let aiDescription = $state<string | null>(null);
	let aiLoading = $state(false);

	// Follow state — derived from reactive sceneFollowState
	let isFollowed = $derived(
		data.scene ? sceneFollowState.followedSlugs.has(data.scene.slug) : false
	);
	let followPending = $state(false);

	/** Mastodon share URL for this scene. */
	let sceneMastodonShareUrl = $derived(
		data.scene
			? `https://sharetomastodon.github.io/?text=${encodeURIComponent(`${data.scene.name} scene on Mercury — mercury://scene/${data.scene.slug}`)}`
			: '#'
	);

	// Listening room state (Tauri only, best-effort)
	let roomStatus = $state<'checking' | 'active' | 'none'>('checking');
	let roomHostPubkey = $state<string | null>(null);

	// Artist suggestion form
	let suggestionInput = $state('');
	let suggestionSubmitted = $state(false);

	// Community suggestions (Tauri only, best-effort)
	let communitySuggestions = $state<string[]>([]);

	onMount(async () => {
		if (!isTauri() || !data.scene) return;

		// Load follow state
		await loadSceneFollows();

		// Check if a listening room is active for this scene
		if (data.scene) {
			try {
				const result = await checkActiveRoom(data.scene.slug);
				if (result.active) {
					roomStatus = 'active';
					roomHostPubkey = result.hostPubkey ?? null;
				} else {
					roomStatus = 'none';
				}
			} catch {
				roomStatus = 'none'; // best-effort — fail silently
			}
		}

		// Load community suggestions — best-effort, fail silently
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			const suggestions = await invoke<Array<{ artist_name: string }>>('get_scene_suggestions', {
				sceneSlug: data.scene.slug
			});
			communitySuggestions = suggestions.map((s) => s.artist_name);
		} catch {
			// best-effort — no suggestions, no problem
		}

		// AI description — attempt after follow state is loaded
		try {
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

	async function handleFollowToggle() {
		if (!data.scene || followPending) return;
		followPending = true;
		try {
			if (isFollowed) {
				await unfollowScene(data.scene.slug);
			} else {
				await followScene(data.scene.slug);
			}
		} finally {
			followPending = false;
		}
	}

	async function handleStartRoom() {
		if (!data.scene) return;
		goto('/room/' + data.scene.slug);
	}

	async function handleSuggestion() {
		if (!data.scene || !suggestionInput.trim()) return;
		const { suggestArtist } = await import('$lib/comms/scenes.svelte.js');
		await suggestArtist(data.scene.slug, '', suggestionInput.trim());
		suggestionSubmitted = true;
	}
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
			<div class="scene-title-row">
				<h1 class="scene-name">{data.scene.name}</h1>
				{#if isTauri()}
					<button
						class="follow-btn"
						class:following={isFollowed}
						disabled={followPending}
						onclick={handleFollowToggle}
						aria-label={isFollowed ? 'Unfollow this scene' : 'Follow this scene'}
					>
						{#if followPending}
							...
						{:else if isFollowed}
							Unfollow Scene
						{:else}
							Follow Scene
						{/if}
					</button>
				{/if}
				<a
					href={sceneMastodonShareUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="share-mastodon-btn"
					aria-label="Share on Mastodon"
					title="Share on Mastodon"
				>&#8593;</a>
			</div>
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

		<!-- Listening Room indicator — Tauri only (requires Nostr) -->
		{#if isTauri() && data.scene && roomStatus !== 'checking'}
			<div class="room-indicator" data-testid="room-indicator">
				{#if roomStatus === 'active'}
					<span class="room-active-dot"></span>
					<span class="room-active-label">Room active</span>
					<a
						href="/room/{data.scene.slug}"
						class="room-join-btn"
						data-testid="room-join-btn"
					>Join</a>
				{:else}
					<a
						href="/room/{data.scene.slug}"
						class="room-start-btn"
						data-testid="room-start-btn"
					>Start listening room</a>
				{/if}
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

		<!-- KB cross-link -->
		<div class="kb-cross-link">
			<a
				href="/kb/genre/{data.scene.slug}"
				class="cross-link-secondary"
			>
				See {data.scene.name} in Knowledge Base →
			</a>
		</div>

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

		<!-- Community suggested artists — Tauri only, best-effort -->
		{#if communitySuggestions.length > 0}
			<section class="scene-section community-section">
				<h2>Community suggested</h2>
				<ul class="community-list">
					{#each communitySuggestions as name}
						<li class="community-item"><em>{name}</em></li>
					{/each}
				</ul>
			</section>
		{/if}

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

		<!-- 5. Artist suggestion form — Tauri only -->
		{#if isTauri()}
			<section class="scene-section suggest-section">
				<h2>Suggest an artist</h2>
				{#if suggestionSubmitted}
					<p class="suggestion-thanks">Thanks — this helps improve scene detection.</p>
				{:else}
					<p class="suggest-desc">Know an artist that belongs here? Let us know.</p>
					<form class="suggest-form" onsubmit={(e) => { e.preventDefault(); handleSuggestion(); }}>
						<input
							class="suggest-input"
							type="text"
							placeholder="Artist name"
							bind:value={suggestionInput}
							aria-label="Artist name to suggest"
						/>
						<button class="suggest-btn" type="submit" disabled={!suggestionInput.trim()}>
							Suggest
						</button>
					</form>
				{/if}
			</section>
		{/if}

		<div class="back-link">
			<a href="/scenes">&larr; All Scenes</a>
		</div>
	</div>
{/if}

<style>
	.not-found {
		margin: 4rem auto;
		text-align: center;
		padding: 20px;
	}

	.not-found h1 {
		font-size: 1.5rem;
		margin-bottom: var(--space-md);
	}

	.not-found a {
		color: var(--acc);
	}

	.scene-page {
		padding: 20px;
	}

	.scene-header {
		margin-bottom: var(--space-lg);
	}

	.scene-type-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--t-3);
		display: block;
		margin-bottom: var(--space-xs);
	}

	.scene-title-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
		margin-bottom: var(--space-sm);
	}

	.scene-name {
		font-size: 2rem;
		font-weight: 700;
		margin: 0;
		color: var(--t-1);
	}

	.follow-btn {
		padding: 6px 14px;
		font-size: 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--border-default, var(--b-1));
		background: transparent;
		color: var(--t-2);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
		white-space: nowrap;
	}

	.follow-btn:hover:not(:disabled) {
		background: var(--bg-3);
		color: var(--t-1);
	}

	.follow-btn.following {
		background: var(--acc);
		color: var(--bg-2);
		border-color: var(--acc);
	}

	.follow-btn.following:hover:not(:disabled) {
		opacity: 0.85;
	}

	.follow-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.scene-meta {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.listener-badge {
		font-size: 0.85rem;
		color: var(--t-2);
	}

	.emerging-count {
		color: var(--t-3);
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
		background: var(--bg-2);
		border-radius: 8px;
		margin-bottom: var(--space-lg);
		border-left: 3px solid var(--accent, #60a5fa);
	}

	.ai-description p {
		margin: 0;
		font-style: italic;
		color: var(--t-2);
		font-size: 0.95rem;
	}

	.source-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		color: var(--t-3);
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
		color: var(--t-1);
	}

	.empty-artists {
		color: var(--t-3);
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
		color: var(--acc);
		text-decoration: none;
	}

	.artist-link:hover {
		text-decoration: underline;
	}

	.artist-country {
		font-size: 0.8rem;
		color: var(--t-3);
	}

	/* Community suggestions — muted/italic styling */
	.community-section h2 {
		color: var(--t-3);
	}

	.community-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.community-item {
		font-size: 0.9rem;
		color: var(--t-3);
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
		color: var(--t-1);
	}

	.track-sep {
		color: var(--t-3);
	}

	.track-artist {
		color: var(--acc);
		text-decoration: none;
		font-size: 0.85rem;
	}

	.track-artist:hover {
		text-decoration: underline;
	}

	/* Suggestion form */
	.suggest-section h2 {
		color: var(--t-2);
	}

	.suggest-desc {
		font-size: 0.85rem;
		color: var(--t-3);
		margin: 0 0 var(--space-sm);
	}

	.suggest-form {
		display: flex;
		gap: var(--space-sm);
		align-items: center;
		flex-wrap: wrap;
	}

	.suggest-input {
		flex: 1;
		min-width: 200px;
		padding: 6px 10px;
		font-size: 0.875rem;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 6px;
		color: var(--t-1);
		outline: none;
		transition: border-color 0.15s;
	}

	.suggest-input:focus {
		border-color: var(--border-default, var(--t-3));
	}

	.suggest-btn {
		padding: 6px 14px;
		font-size: 0.8rem;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 6px;
		color: var(--t-2);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.suggest-btn:hover:not(:disabled) {
		background: var(--bg-2);
		color: var(--t-1);
	}

	.suggest-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.suggestion-thanks {
		font-size: 0.875rem;
		color: var(--t-3);
		font-style: italic;
		margin: 0;
	}

	/* ── Mastodon Share Button ───────────────────────────── */
	.share-mastodon-btn {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--b-1);
		border-radius: 4px;
		line-height: 1;
		transition: color 0.15s, border-color 0.15s;
		flex-shrink: 0;
	}

	.share-mastodon-btn:hover {
		color: var(--t-2);
		border-color: var(--t-3);
	}

	/* ── KB Cross-link ─────────────────────────────────── */
	.kb-cross-link { margin: var(--space-md) 0; }
	.cross-link-secondary {
		font-size: 0.8rem;
		color: var(--t-3);
		text-decoration: none;
		transition: color 0.15s;
	}
	.cross-link-secondary:hover { color: var(--acc); }

	.back-link {
		margin-top: var(--space-xl);
		padding-top: var(--space-md);
		border-top: 1px solid var(--b-1);
	}

	.back-link a {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
	}

	.back-link a:hover {
		color: var(--acc);
	}

	/* ── Listening Room Indicator ──────────────────────── */
	.room-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 8px;
		font-size: 0.85rem;
	}

	.room-active-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #4ade80; /* green — active indicator */
		flex-shrink: 0;
		animation: pulse-dot 2s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.room-active-label {
		color: var(--t-2);
		flex: 1;
	}

	.room-join-btn,
	.room-start-btn {
		padding: 4px 12px;
		font-size: 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--b-1);
		background: transparent;
		color: var(--acc);
		text-decoration: none;
		white-space: nowrap;
		transition: background 0.15s, border-color 0.15s;
	}

	.room-join-btn:hover,
	.room-start-btn:hover {
		background: var(--bg-3);
		border-color: var(--acc);
	}

	.room-start-btn {
		color: var(--t-3);
	}
</style>
