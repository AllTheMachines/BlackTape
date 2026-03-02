<script lang="ts">
	import { PROJECT_NAME } from '$lib/config';
	import { aiState, saveAiSetting } from '$lib/ai/state.svelte';
	import { MODELS, downloadModel, checkModelExists } from '$lib/ai/model-manager';
	import type { DownloadProgressEvent } from '$lib/ai/model-manager';
	import { pickMusicFolder, addMusicFolder, scanMusicFolder } from '$lib/library/scanner';
	import type { ScanProgress } from '$lib/library/types';
	import { spotifyState } from '$lib/spotify/state.svelte';
	import SpotifySettings from './SpotifySettings.svelte';

	let props: {
		onComplete: () => void;
	} = $props();

	let step = $state(1); // 1=Welcome, 2=Library, 3=Spotify, 4=AI Models, 5=Done

	// Library state
	let libraryPath = $state('');
	let isScanning = $state(false);
	let scanProgress = $state<ScanProgress | null>(null);
	let scanResult = $state<number | null>(null);
	let scanError = $state('');

	// AI model state
	let generationExists = $state(false);
	let embeddingExists = $state(false);
	let isDownloading = $state(false);
	let downloadingModelName = $state('');
	let downloadProgress = $state<DownloadProgressEvent | null>(null);
	let downloadError = $state('');

	async function handlePickFolder() {
		const path = await pickMusicFolder();
		if (!path) return;
		libraryPath = path;
		isScanning = true;
		scanError = '';
		try {
			await addMusicFolder(path);
			const count = await scanMusicFolder(path, (p) => { scanProgress = { ...p }; });
			scanResult = count;
			isScanning = false;
		} catch (err) {
			scanError = err instanceof Error ? err.message : String(err);
			isScanning = false;
		}
	}

	async function goToAiModels() {
		step = 4;
		const { invoke } = await import('@tauri-apps/api/core');
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');
		generationExists = settings['local_gen_model_status'] === 'ready' || settings['local_gen_model_status'] === 'downloaded';
		embeddingExists = settings['local_embed_model_status'] === 'ready' || settings['local_embed_model_status'] === 'downloaded';
		if (!generationExists) generationExists = await checkModelExists('generation');
		if (!embeddingExists) embeddingExists = await checkModelExists('embedding');
	}

	async function handleDownloadModels() {
		isDownloading = true;
		downloadError = '';
		try {
			downloadingModelName = MODELS.generation.name;
			downloadProgress = null;
			await downloadModel('generation', (progress: DownloadProgressEvent) => {
				downloadProgress = { ...progress };
			});
			generationExists = true;
			await saveAiSetting('local_gen_model_status', 'downloaded');

			downloadingModelName = MODELS.embedding.name;
			downloadProgress = null;
			await downloadModel('embedding', (progress: DownloadProgressEvent) => {
				downloadProgress = { ...progress };
			});
			embeddingExists = true;
			await saveAiSetting('local_embed_model_status', 'downloaded');

			downloadProgress = null;
			isDownloading = false;
		} catch (err) {
			downloadError = err instanceof Error ? err.message : String(err);
			isDownloading = false;
		}
	}

	async function finishSetup() {
		const { invoke } = await import('@tauri-apps/api/core');
		await invoke('set_ai_setting', { key: 'setup_complete', value: '1' });
		props.onComplete();
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
</script>

<div class="wizard">
	<!-- Step indicators -->
	<div class="steps-nav">
		{#each [1, 2, 3, 4, 5] as s}
			<div class="step-dot" class:active={step === s} class:done={step > s}></div>
		{/each}
	</div>

	<!-- Step 1: Welcome -->
	{#if step === 1}
		<div class="step">
			<div class="step-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12 2L2 7l10 5 10-5-10-5z" />
					<path d="M2 17l10 5 10-5" />
					<path d="M2 12l10 5 10-5" />
				</svg>
			</div>
			<h1>Getting {PROJECT_NAME} ready</h1>
			<p class="step-desc">Let's get a few things set up before you start discovering music.</p>

			<div class="checklist">
				<div class="check-item optional">
					<span class="check-icon">○</span>
					<span class="check-label">Music library <span class="check-badge optional-badge">Optional</span></span>
				</div>
				<div class="check-item optional">
					<span class="check-icon">○</span>
					<span class="check-label">Spotify <span class="check-badge optional-badge">Optional</span></span>
				</div>
				<div class="check-item optional">
					<span class="check-icon">○</span>
					<span class="check-label">AI models <span class="check-badge optional-badge">Optional</span></span>
				</div>
			</div>

			<button class="primary-btn" onclick={() => step = 2}>Continue</button>
		</div>

	<!-- Step 2: Music Library -->
	{:else if step === 2}
		<div class="step">
			<div class="step-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M9 18V5l12-2v13" />
					<circle cx="6" cy="18" r="3" />
					<circle cx="18" cy="16" r="3" />
				</svg>
			</div>
			<h1>Music library (optional)</h1>
			<p class="step-desc">
				Point {PROJECT_NAME} at your music folder to browse and play your local collection.
			</p>

			{#if libraryPath}
				<div class="folder-path">{libraryPath}</div>
			{/if}

			{#if isScanning && scanProgress}
				<div class="download-progress">
					<p class="downloading-label">Scanning files...</p>
					<div class="progress-bar">
						<div
							class="progress-fill"
							style="width: {scanProgress.total > 0 ? Math.round((scanProgress.scanned / scanProgress.total) * 100) : 0}%"
						></div>
					</div>
					<p class="progress-text">
						{scanProgress.scanned} / {scanProgress.total} files
					</p>
				</div>
			{:else if scanResult !== null}
				<p class="scan-summary">Found {scanResult} tracks</p>
			{:else if scanError}
				<p class="error-text">{scanError}</p>
			{/if}

			<div class="step-actions">
				{#if scanResult === null}
					<button class="primary-btn" onclick={handlePickFolder} disabled={isScanning}>
						Choose folder
					</button>
				{/if}
				<button class="secondary-btn" onclick={() => step = 3} disabled={isScanning}>
					{scanResult !== null ? 'Continue' : 'Skip'}
				</button>
			</div>
		</div>

	<!-- Step 3: Connect Spotify -->
	{:else if step === 3}
		<div class="step">
			<div class="step-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<path d="M3 18v-6a9 9 0 0 1 18 0v6" />
					<path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
				</svg>
			</div>
			<h1>Connect Spotify (optional)</h1>
			<p class="step-desc">
				Link your Spotify account to play artist top tracks directly in Spotify Desktop.
			</p>

			<div class="spotify-embed">
				<SpotifySettings />
			</div>

			<div class="step-actions">
				<button class="secondary-btn" onclick={goToAiModels}>
					{spotifyState.connected ? 'Continue' : 'Skip'}
				</button>
			</div>
		</div>

	<!-- Step 4: AI Models -->
	{:else if step === 4}
		<div class="step">
			<div class="step-icon">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
				</svg>
			</div>
			<h1>AI models (optional)</h1>
			<p class="step-desc">
				AI features are optional — {PROJECT_NAME} works fully without them.
				Models enable artist biography generation and music similarity matching.
			</p>

			<div class="model-list">
				<div class="model-row">
					<span class="model-name">{MODELS.generation.name}</span>
					<span class="model-size">~4 GB</span>
					<span class="model-status" class:ready={generationExists}>{generationExists ? '✓' : '–'}</span>
				</div>
				<div class="model-row">
					<span class="model-name">{MODELS.embedding.name}</span>
					<span class="model-size">~100 MB</span>
					<span class="model-status" class:ready={embeddingExists}>{embeddingExists ? '✓' : '–'}</span>
				</div>
			</div>

			{#if isDownloading}
				<div class="download-progress">
					<p class="downloading-label">Downloading {downloadingModelName}...</p>
					{#if downloadProgress}
						<div class="progress-bar">
							<div
								class="progress-fill"
								style="width: {downloadProgress.total > 0 ? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100) : 0}%"
							></div>
						</div>
						<p class="progress-text">
							{formatBytes(downloadProgress.downloaded)} / {formatBytes(downloadProgress.total)}
						</p>
					{/if}
				</div>
			{:else if downloadError}
				<p class="error-text">{downloadError}</p>
			{/if}

			<div class="step-actions">
				{#if !generationExists || !embeddingExists}
					<button class="primary-btn" onclick={handleDownloadModels} disabled={isDownloading}>
						Download models
					</button>
				{/if}
				<button class="secondary-btn" onclick={() => step = 5} disabled={isDownloading}>
					{generationExists && embeddingExists ? 'Continue' : 'Skip for now'}
				</button>
			</div>
		</div>

	<!-- Step 5: Done -->
	{:else if step === 5}
		<div class="step">
			<div class="step-icon ready">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12" />
				</svg>
			</div>
			<h1>You're set up</h1>
			<p class="step-desc">Everything is in place. Start discovering music.</p>
			<button class="primary-btn" onclick={finishSetup}>Launch {PROJECT_NAME}</button>
		</div>
	{/if}
</div>

<style>
	.wizard {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - var(--header-height));
		padding: var(--space-xl);
		text-align: center;
	}

	.steps-nav {
		display: flex;
		gap: 8px;
		margin-bottom: var(--space-2xl);
	}

	.step-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--b-2);
		transition: background 0.2s;
	}

	.step-dot.active {
		background: var(--acc);
	}

	.step-dot.done {
		background: var(--t-3);
	}

	.step {
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 520px;
		width: 100%;
	}

	.step-icon {
		color: var(--t-3);
		margin-bottom: var(--space-lg);
		transition: color 0.2s;
	}

	.step-icon.ready {
		color: var(--acc);
	}

	h1 {
		font-size: 1.6rem;
		font-weight: 300;
		letter-spacing: 0.04em;
		color: var(--t-1);
		margin: 0 0 var(--space-md);
	}

	.step-desc {
		color: var(--t-2);
		line-height: 1.7;
		margin: 0 0 var(--space-xl);
		font-size: 0.95rem;
	}

	/* Welcome checklist */
	.checklist {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-xl);
		text-align: left;
		width: 100%;
	}

	.check-item {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 0.9rem;
	}

	.check-icon {
		font-size: 0.8rem;
		width: 16px;
		text-align: center;
	}

	.check-item.optional .check-icon { color: var(--t-3); }

	.check-badge {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 1px 5px;
		border-radius: 0;
		margin-left: 4px;
	}

	.optional-badge {
		background: var(--bg-3);
		color: var(--t-3);
		border: 1px solid var(--b-1);
	}

	/* Folder path display */
	.folder-path {
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--t-2);
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		padding: var(--space-xs) var(--space-sm);
		margin-bottom: var(--space-md);
		width: 100%;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Scan summary */
	.scan-summary {
		color: var(--acc);
		font-size: 0.9rem;
		font-weight: 500;
		margin: 0 0 var(--space-md);
	}

	/* Spotify embed */
	.spotify-embed {
		width: 100%;
		margin-bottom: var(--space-lg);
		text-align: left;
	}

	/* AI models step */
	.model-list {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: var(--space-lg);
	}

	.model-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		font-size: 0.85rem;
		text-align: left;
	}

	.model-name {
		flex: 1;
		color: var(--t-1);
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	.model-size {
		color: var(--t-3);
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.model-status {
		color: var(--t-3);
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.model-status.ready {
		color: var(--acc);
	}

	/* Download progress */
	.download-progress {
		width: 100%;
		margin-bottom: var(--space-lg);
	}

	.downloading-label {
		font-size: 0.82rem;
		color: var(--t-2);
		margin: 0 0 var(--space-xs);
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--b-1);
		overflow: hidden;
		margin-bottom: var(--space-xs);
	}

	.progress-fill {
		height: 100%;
		background: var(--acc);
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.75rem;
		color: var(--t-3);
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.error-text {
		color: #ef4444;
		font-size: 0.82rem;
		margin-bottom: var(--space-md);
	}

	/* Buttons */
	.step-actions {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-xs);
	}

	.primary-btn {
		padding: var(--space-sm) var(--space-2xl);
		font-size: 0.9rem;
		font-family: var(--font-sans);
		background: var(--acc);
		border: 1px solid var(--acc);
		color: #fff;
		cursor: pointer;
		border-radius: 0;
		transition: opacity 0.15s;
	}

	.primary-btn:hover:not(:disabled) {
		opacity: 0.85;
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-btn {
		padding: var(--space-sm) var(--space-xl);
		font-size: 0.9rem;
		font-family: var(--font-sans);
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		color: var(--t-1);
		cursor: pointer;
		border-radius: 0;
		transition: border-color 0.15s;
	}

	.secondary-btn:hover:not(:disabled) {
		border-color: var(--b-3);
	}

	.secondary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
