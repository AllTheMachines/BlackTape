<script lang="ts">
	import AiSettings from '$lib/components/AiSettings.svelte';
	import { isTauri } from '$lib/platform';
	import { onMount } from 'svelte';

	let tauriMode = $state(false);

	onMount(() => {
		tauriMode = isTauri();
	});
</script>

<svelte:head>
	<title>Settings</title>
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
		<h2>Settings are only available in the desktop app</h2>
		<p>AI features and local configuration require the Mercury desktop application.</p>
	</div>
{:else}
	<div class="settings-page">
		<h1>Settings</h1>
		<AiSettings />
	</div>
{/if}

<style>
	.desktop-only {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding: var(--space-xl);
		color: var(--text-secondary);
	}

	.desktop-only-icon {
		color: var(--text-muted);
		margin-bottom: var(--space-lg);
	}

	.desktop-only h2 {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 var(--space-sm);
	}

	.desktop-only p {
		font-size: 0.85rem;
		max-width: 400px;
		margin: 0;
	}

	.settings-page {
		max-width: var(--max-width);
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.settings-page h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-lg);
	}
</style>
