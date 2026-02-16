<script lang="ts">
	import '$lib/styles/theme.css';
	import { PROJECT_NAME } from '$lib/config';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating } from '$app/stores';
	import { isTauri } from '$lib/platform';
	import Player from '$lib/components/Player.svelte';
	import { playerState } from '$lib/player/state.svelte';

	let { children } = $props();

	let showPlayer = $state(false);

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
	<a href="/" class="site-name">{PROJECT_NAME}</a>
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
