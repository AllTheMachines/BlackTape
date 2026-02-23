<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
	import { isTauri } from '$lib/platform';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import DatabaseSetup from '$lib/components/DatabaseSetup.svelte';

	let dbStatus = $state<'checking' | 'ready' | 'missing'>('checking');
	let dbPath = $state('');

	async function checkDatabase() {
		// --- TEMPORARY DEBUG STAGE 1: unconditional write ---
		try {
			const { invoke: _inv } = await import('@tauri-apps/api/core');
			await _inv('write_json_to_path', {
				path: 'C:\\Users\\User\\AppData\\Local\\Temp\\mercury_stage1.json',
				json: JSON.stringify({ stage: 1, isTauri: isTauri(), ts: Date.now() })
			});
		} catch (e) {
			// Tauri invoke not available at all
		}
		// --- END STAGE 1 ---

		if (!isTauri()) {
			dbStatus = 'ready';
			return;
		}
		try {
			const { invoke } = await import('@tauri-apps/api/core');

			// --- TEMPORARY DEBUG STAGE 2: isTauri is true ---
			await invoke('write_json_to_path', {
				path: 'C:\\Users\\User\\AppData\\Local\\Temp\\mercury_stage2.json',
				json: JSON.stringify({ stage: 2, ts: Date.now() })
			}).catch(() => {});
			// --- END STAGE 2 ---

			const result: { exists: boolean; path: string; dir: string } =
				await invoke('check_database');
			dbStatus = result.exists ? 'ready' : 'missing';
			dbPath = result.path;

			// --- TEMPORARY DEBUG STAGE 3: check_database succeeded ---
			try {
				const rows = await invoke('query_mercury_db', {
					sql: 'SELECT COUNT(*) as n FROM artists',
					params: []
				});
				await invoke('write_json_to_path', {
					path: 'C:\\Users\\User\\AppData\\Local\\Temp\\mercury_stage3.json',
					json: JSON.stringify({ stage: 3, ok: true, rows, dbStatus, ts: Date.now() })
				});
			} catch (e) {
				await invoke('write_json_to_path', {
					path: 'C:\\Users\\User\\AppData\\Local\\Temp\\mercury_stage3.json',
					json: JSON.stringify({ stage: 3, ok: false, error: String(e) })
				}).catch(() => {});
			}
			// --- END STAGE 3 ---
		} catch {
			// If check fails, assume ready to avoid blocking the web build
			dbStatus = 'ready';
		}
	}

	$effect(() => {
		checkDatabase();
	});
</script>

<svelte:head>
	<title>{PROJECT_NAME}</title>
	<meta name="description" content={PROJECT_TAGLINE} />
</svelte:head>

{#if dbStatus === 'checking'}
	<div class="loading">
		<p>Loading...</p>
	</div>
{:else if dbStatus === 'missing'}
	<DatabaseSetup {dbPath} onRetry={checkDatabase} />
{:else}
	<div class="hero">
		<h1>{PROJECT_NAME}</h1>
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
		color: var(--text-muted);
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		padding: var(--space-xl);
		text-align: center;
	}

	h1 {
		font-size: 3.5rem;
		font-weight: 300;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		margin: 0 0 var(--space-sm);
		color: var(--text-accent);
	}

	.tagline {
		font-size: 1.1rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-2xl);
		font-weight: 300;
	}

	.search-container {
		width: 100%;
		max-width: 560px;
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 2.2rem;
		}

		.tagline {
			font-size: 0.95rem;
		}
	}
</style>
