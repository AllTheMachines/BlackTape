<script lang="ts">
	import { onMount } from 'svelte';
	import { PROJECT_NAME, BLACKTAPE_PUBKEY } from '$lib/config';

	type FetchState = 'loading' | 'loaded' | 'empty' | 'error';

	let fetchState = $state<FetchState>('loading');
	let backers = $state<string[]>([]);
	let errorRetrying = $state(false);

	async function loadBackers() {
		fetchState = 'loading';
		backers = [];

		if (!BLACKTAPE_PUBKEY) {
			fetchState = 'empty';
			return;
		}

		try {
			const { initNostr, ndkState } = await import('$lib/comms/nostr.svelte.js');
			await initNostr();

			const { ndk } = ndkState;
			if (!ndk) {
				fetchState = 'error';
				return;
			}

			const events = await ndk.fetchEvents({
				kinds: [30000],
				authors: [BLACKTAPE_PUBKEY],
				'#d': ['backers']
			});

			const names: string[] = [];
			for (const event of events) {
				for (const tag of event.tags) {
					if (tag[0] === 'name' && tag[1]) {
						names.push(tag[1]);
					}
				}
			}

			if (names.length === 0) {
				fetchState = 'empty';
			} else {
				backers = names;
				fetchState = 'loaded';
			}
		} catch {
			fetchState = 'error';
		}
	}

	onMount(() => {
		loadBackers();
	});

	async function handleRetry() {
		errorRetrying = true;
		await loadBackers();
		errorRetrying = false;
	}
</script>

<svelte:head>
	<title>Backers — {PROJECT_NAME}</title>
</svelte:head>

<div class="backers-page">
	<div class="backers-header">
		<a href="/about" class="back-link">← About</a>
		<h1>Backers</h1>
		<p class="backers-subtitle">People who keep BlackTape alive.</p>
	</div>

	{#if fetchState === 'loading'}
		<div class="backers-loading">
			<span class="loading-spinner" aria-label="Loading backers..."></span>
			<span class="loading-text">Loading backers...</span>
		</div>
	{:else if fetchState === 'loaded'}
		<ul class="backers-list">
			{#each backers as name}
				<li class="backer-name">{name}</li>
			{/each}
		</ul>
	{:else if fetchState === 'empty'}
		<p class="backers-empty">
			{BLACKTAPE_PUBKEY ? 'No backers listed yet.' : 'Backer credits coming soon.'}
		</p>
	{:else if fetchState === 'error'}
		<div class="backers-error">
			<p>Could not load backers.</p>
			<button class="retry-btn" onclick={handleRetry} disabled={errorRetrying}>
				{errorRetrying ? 'Retrying...' : 'Retry'}
			</button>
		</div>
	{/if}

	<div class="backers-cta">
		<a href="/about#support" class="backers-cta-link">Want to be listed? Support BlackTape →</a>
	</div>
</div>

<style>
	.backers-page {
		padding: 20px;
	}

	.backers-header {
		margin-bottom: var(--space-xl, 2rem);
	}

	.back-link {
		font-size: 0.8rem;
		color: var(--t-3);
		text-decoration: none;
		display: inline-block;
		margin-bottom: var(--space-sm, 0.5rem);
	}

	.back-link:hover {
		color: var(--t-2);
		text-decoration: underline;
	}

	.backers-header h1 {
		font-size: 1.4rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs, 0.25rem) 0;
	}

	.backers-subtitle {
		font-size: 0.875rem;
		color: var(--t-3);
		margin: 0;
	}

	.backers-loading {
		display: flex;
		align-items: center;
		gap: var(--space-sm, 0.5rem);
		color: var(--t-3);
		font-size: 0.875rem;
		padding: var(--space-lg, 1.5rem) 0;
	}

	.loading-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid var(--b-1);
		border-top-color: var(--t-3);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.backers-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.backer-name {
		font-size: 0.9rem;
		color: var(--t-2);
		padding: var(--space-xs, 0.25rem) 0;
		border-bottom: 1px solid var(--b-1);
		line-height: 1.6;
	}

	.backer-name:last-child {
		border-bottom: none;
	}

	.backers-empty {
		font-size: 0.875rem;
		color: var(--t-3);
		padding: var(--space-lg, 1.5rem) 0;
	}

	.backers-error {
		padding: var(--space-lg, 1.5rem) 0;
	}

	.backers-error p {
		font-size: 0.875rem;
		color: var(--t-3);
		margin: 0 0 var(--space-sm, 0.5rem) 0;
	}

	.retry-btn {
		font-size: 0.8rem;
		color: var(--t-3);
		background: transparent;
		border: 1px solid var(--b-1);
		border-radius: 0;
		padding: 0.2rem 0.6rem;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}

	.retry-btn:hover:not(:disabled) {
		color: var(--t-2);
		border-color: var(--t-3);
	}

	.retry-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.backers-cta {
		margin-top: var(--space-xl, 2rem);
		padding-top: var(--space-lg, 1.5rem);
		border-top: 1px solid var(--b-1);
	}

	.backers-cta-link {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
	}

	.backers-cta-link:hover {
		color: var(--t-2);
		text-decoration: underline;
	}
</style>
