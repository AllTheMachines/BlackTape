<script lang="ts">
	import '$lib/styles/theme.css';
	import { PROJECT_NAME } from '$lib/config';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating, page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { isTauri } from '$lib/platform';
	import Player from '$lib/components/Player.svelte';
	import { playerState } from '$lib/player/state.svelte';
	import { aiState, loadAiSettings, initializeAi } from '$lib/ai/state.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	let showPlayer = $state(false);
	let tauriMode = $state(false);
	let canGoBack = $derived($page.url.pathname !== '/');

	onMount(async () => {
		tauriMode = isTauri();

		if (isTauri()) {
			await loadAiSettings();
			if (aiState.enabled) {
				initializeAi();
			}
		}
	});

	$effect(() => {
		showPlayer = isTauri() && playerState.currentTrack !== null;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $navigating}
	<div class="loading-bar" aria-hidden="true"></div>
{/if}

<header>
	{#if canGoBack}
		<button class="back-btn" onclick={() => history.back()} title="Go back" aria-label="Go back">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6" />
			</svg>
		</button>
	{/if}
	<a href="/" class="site-name">{PROJECT_NAME}</a>
	{#if tauriMode}
		<nav class="nav-links">
			<a href="/library" class="nav-link">Library</a>
			<a href="/explore" class="nav-link">Explore</a>
			<a href="/settings" class="nav-link">Settings</a>
		</nav>
		{#if aiState.status === 'loading' || aiState.status === 'downloading'}
			<span class="ai-indicator" title="AI is loading">
				<span class="ai-dot pulsing"></span>
				<span class="ai-label">AI</span>
			</span>
		{:else if aiState.status === 'ready'}
			<span class="ai-indicator" title="AI is ready">
				<span class="ai-dot ready"></span>
				<span class="ai-label">AI</span>
			</span>
		{:else if aiState.status === 'error'}
			<span class="ai-indicator" title="AI error: {aiState.error}">
				<span class="ai-dot error"></span>
				<span class="ai-label">AI</span>
			</span>
		{/if}
	{/if}
</header>

<main class:has-player={showPlayer}>
	{@render children()}
</main>

{#if isTauri()}
	<Player />
{/if}

<style>
	header {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		height: var(--header-height);
		padding: 0 var(--space-lg);
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-subtle);
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 4px;
		margin-right: var(--space-xs);
		border-radius: 4px;
		transition: color 0.15s;
	}

	.back-btn:hover {
		color: var(--text-primary);
	}

	.site-name {
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-secondary);
		text-decoration: none;
	}

	.site-name:hover {
		color: var(--text-primary);
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		align-items: center;
	}

	.nav-link {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-decoration: none;
		margin-left: var(--space-lg);
		transition: color 0.15s;
	}

	.nav-link:hover {
		color: var(--text-secondary);
		text-decoration: none;
	}

	.ai-indicator {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-left: auto;
		padding: 4px 8px;
		font-size: 0.7rem;
		color: var(--text-muted);
		cursor: default;
	}

	.ai-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.ai-dot.ready {
		background: var(--text-accent);
	}

	.ai-dot.error {
		background: #ef4444;
	}

	.ai-dot.pulsing {
		background: var(--text-muted);
		animation: ai-pulse 1.5s ease-in-out infinite;
	}

	@keyframes ai-pulse {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}

	.ai-label {
		font-weight: 500;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	main {
		width: 100%;
	}

	main.has-player {
		padding-bottom: var(--player-height);
	}

	.loading-bar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		z-index: 200;
		background: var(--text-accent);
		animation: loading-slide 1.2s ease-in-out infinite;
	}

	@keyframes loading-slide {
		0% {
			transform: scaleX(0);
			transform-origin: left;
		}
		50% {
			transform: scaleX(1);
			transform-origin: left;
		}
		50.01% {
			transform-origin: right;
		}
		100% {
			transform: scaleX(0);
			transform-origin: right;
		}
	}
</style>
