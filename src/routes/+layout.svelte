<script lang="ts">
	import '$lib/styles/theme.css';
	import { PROJECT_NAME } from '$lib/config';
	import favicon from '$lib/assets/favicon.svg';
	import { navigating } from '$app/stores';

	let { children } = $props();
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

<main>
	{@render children()}
</main>

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
