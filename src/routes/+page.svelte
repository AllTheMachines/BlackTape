<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
	import { isTauri } from '$lib/platform';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SetupWizard from '$lib/components/SetupWizard.svelte';

	let uiState = $state<'checking' | 'wizard' | 'ready'>('checking');
	let dbPath = $state('');

	async function checkDatabase() {
		if (!isTauri()) {
			uiState = 'ready';
			return;
		}
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			const [dbResult, setupComplete] = await Promise.all([
				invoke<{ exists: boolean; path: string; dir: string }>('check_database'),
				invoke<string | null>('get_ai_setting', { key: 'setup_complete' })
			]);

			dbPath = dbResult.path;

			// Existing user: no setup_complete row yet but DB already present — auto-graduate
			if (setupComplete === null && dbResult.exists) {
				await invoke('set_ai_setting', { key: 'setup_complete', value: '1' });
				uiState = 'ready';
				return;
			}

			// Setup already complete
			if (setupComplete === '1') {
				uiState = 'ready';
				return;
			}

			// Show wizard
			uiState = 'wizard';
		} catch {
			// Fallback — don't block the app
			uiState = 'ready';
		}
	}

	async function handleRetry() {
		const { invoke } = await import('@tauri-apps/api/core');
		const result: { exists: boolean; path: string; dir: string } =
			await invoke('check_database');
		dbPath = result.path;
	}

	function handleWizardComplete() {
		uiState = 'ready';
	}

	$effect(() => {
		checkDatabase();
	});
</script>

<svelte:head>
	<title>{PROJECT_NAME}</title>
	<meta name="description" content={PROJECT_TAGLINE} />
</svelte:head>

{#if uiState === 'checking'}
	<div class="loading">
		<p>Loading...</p>
	</div>
{:else if uiState === 'wizard'}
	<SetupWizard {dbPath} onRetry={handleRetry} onComplete={handleWizardComplete} />
{:else}
	<div class="hero">
		<img src="/logo.png" alt={PROJECT_NAME} class="logo-img" />
		<p class="tagline">{PROJECT_TAGLINE}</p>

		<div class="search-container">
			<SearchBar size="large" />
		</div>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		color: var(--t-3);
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: var(--space-2xl) var(--space-xl) var(--space-xl);
		text-align: center;
	}

	.logo-img {
		height: 64px;
		width: auto;
		margin: 0 0 var(--space-sm);
	}

	.tagline {
		font-size: 1.1rem;
		color: var(--t-2);
		margin: 0 0 var(--space-2xl);
		font-weight: 300;
	}

	.search-container {
		width: 100%;
	}

	@media (max-width: 600px) {
		.logo-img {
			height: 44px;
		}

		.tagline {
			font-size: 0.95rem;
		}
	}
</style>
