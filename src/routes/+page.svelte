<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
	import { isTauri } from '$lib/platform';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SetupWizard from '$lib/components/SetupWizard.svelte';

	let uiState = $state<'checking' | 'wizard' | 'ready'>('checking');

	async function checkSetup() {
		if (!isTauri()) {
			uiState = 'ready';
			return;
		}
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			const settings = await invoke<Record<string, string>>('get_all_ai_settings');
			const setupComplete = settings['setup_complete'] ?? null;

			// Setup already complete
			if (setupComplete === '1') {
				uiState = 'ready';
				return;
			}

			// Existing user upgrading — has other settings but no setup_complete flag.
			// Auto-graduate them so they don't see the wizard again.
			if (setupComplete === null && Object.keys(settings).length > 0) {
				await invoke('set_ai_setting', { key: 'setup_complete', value: '1' });
				uiState = 'ready';
				return;
			}

			// Fresh user (no settings at all, or setup not complete) — show wizard
			uiState = 'wizard';
		} catch {
			// Fallback — don't block the app
			uiState = 'ready';
		}
	}

	function handleWizardComplete() {
		uiState = 'ready';
	}

	$effect(() => {
		checkSetup();
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
	<SetupWizard onComplete={handleWizardComplete} />
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
