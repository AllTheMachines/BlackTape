<script lang="ts">
	import { onMount } from 'svelte';
	import {
		aiState,
		loadAiSettings,
		saveAiSetting,
		initializeAi,
		shutdownAi
	} from '$lib/ai/state.svelte';
	import { MODELS, downloadModel, checkModelExists } from '$lib/ai/model-manager';
	import type { DownloadProgressEvent } from '$lib/ai/model-manager';
	import { AI_PROVIDERS, getProviderById } from '$lib/ai/providers';

	let generationExists = $state(false);
	let embeddingExists = $state(false);
	let isDownloading = $state(false);
	let downloadingModelName = $state('');
	let downloadProgress = $state<DownloadProgressEvent | null>(null);
	let showApiKey = $state(false);
	let loaded = $state(false);

	// Remote API form state
	let remoteBaseUrl = $state('');
	let remoteApiKey = $state('');
	let remoteModel = $state('');
	let remoteSaved = $state(false);

	onMount(async () => {
		await loadAiSettings();
		remoteBaseUrl = aiState.apiBaseUrl;
		remoteApiKey = aiState.apiKey;
		remoteModel = aiState.apiModel;
		await checkModels();
		loaded = true;
	});

	async function checkModels() {
		try {
			generationExists = await checkModelExists('generation');
			embeddingExists = await checkModelExists('embedding');
		} catch {
			// Not in Tauri context or error
		}
	}

	async function handleToggle() {
		if (aiState.enabled) {
			// Turning OFF
			await shutdownAi();
			await saveAiSetting('enabled', 'false');
		} else {
			// Turning ON
			await saveAiSetting('enabled', 'true');
			aiState.enabled = true;

			if (generationExists && embeddingExists) {
				// Models already downloaded, just initialize
				await initializeAi();
			}
			// If models not downloaded, UI will show download prompt
		}
	}

	async function handleDownload() {
		isDownloading = true;
		aiState.status = 'downloading';

		try {
			// Download generation model first
			downloadingModelName = MODELS.generation.name;
			downloadProgress = null;
			await downloadModel('generation', (progress: DownloadProgressEvent) => {
				downloadProgress = { ...progress };
				aiState.downloadProgress = { ...progress };
				aiState.downloadingModel = MODELS.generation.name;
			});
			generationExists = true;
			await saveAiSetting('local_gen_model_status', 'downloaded');

			// Then download embedding model
			downloadingModelName = MODELS.embedding.name;
			downloadProgress = null;
			await downloadModel('embedding', (progress: DownloadProgressEvent) => {
				downloadProgress = { ...progress };
				aiState.downloadProgress = { ...progress };
				aiState.downloadingModel = MODELS.embedding.name;
			});
			embeddingExists = true;
			await saveAiSetting('local_embed_model_status', 'downloaded');

			// Both downloaded, initialize
			downloadProgress = null;
			aiState.downloadProgress = null;
			aiState.downloadingModel = '';
			isDownloading = false;

			await initializeAi();
		} catch (err) {
			aiState.status = 'error';
			aiState.error = err instanceof Error ? err.message : String(err);
			isDownloading = false;
			downloadProgress = null;
		}
	}

	async function handleProviderChange(provider: 'local' | 'remote') {
		await saveAiSetting('provider', provider);
		if (aiState.enabled) {
			if (provider === 'remote') {
				await shutdownAi();
				aiState.enabled = true;
				aiState.provider = 'remote';
				if (remoteApiKey && remoteBaseUrl && remoteModel) {
					await saveAiSetting('api_key', remoteApiKey);
					await saveAiSetting('api_base_url', remoteBaseUrl);
					await saveAiSetting('api_model', remoteModel);
					await initializeAi();
				}
			} else {
				await initializeAi();
			}
		}
	}

	async function handleSaveRemote() {
		await saveAiSetting('api_key', remoteApiKey);
		await saveAiSetting('api_base_url', remoteBaseUrl);
		await saveAiSetting('api_model', remoteModel);
		remoteSaved = true;
		setTimeout(() => { remoteSaved = false; }, 2000);

		if (aiState.enabled && aiState.provider === 'remote') {
			await initializeAi();
		}
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	}

	let downloadPercent = $derived(
		downloadProgress && downloadProgress.total > 0
			? Math.round((downloadProgress.downloaded / downloadProgress.total) * 100)
			: 0
	);

	let totalModelSize = $derived(
		Object.values(MODELS).reduce((sum, m) => sum + m.sizeBytes, 0)
	);

	let selectedProvider = $derived(
		AI_PROVIDERS.find(p => p.id === aiState.selectedProviderName) ?? null
	);

	async function handleProviderSelect(providerId: string) {
		const provider = getProviderById(providerId);
		if (!provider) return;
		await saveAiSetting('selected_provider_name', providerId);
		// Pre-fill model with provider default only if model field is empty
		if (!aiState.apiModel) {
			remoteModel = provider.defaultModel;
			await saveAiSetting('api_model', provider.defaultModel);
		}
		// Pre-fill base URL from provider config
		remoteBaseUrl = provider.baseUrl;
		await saveAiSetting('api_base_url', provider.baseUrl);
	}

	async function handleAutoGenerateToggle() {
		const newVal = !aiState.autoGenerateOnVisit;
		await saveAiSetting('auto_generate_on_visit', String(newVal));
	}

	async function openAffiliateUrl(url: string) {
		try {
			const { open } = await import('@tauri-apps/plugin-shell');
			await open(url);
		} catch {
			// Silent — fallback to copy-paste instructions
		}
	}
</script>

{#if !loaded}
	<div class="loading">Loading AI settings...</div>
{:else}
	<!-- Section 1: AI Features Toggle -->
	<div class="settings-section">
		<div class="section-header">
			<div class="section-title-row">
				<h2>AI Features</h2>
				<label class="toggle-switch">
					<input
						type="checkbox"
						checked={aiState.enabled}
						onchange={handleToggle}
						disabled={isDownloading}
					/>
					<span class="toggle-slider"></span>
				</label>
			</div>
			{#if !aiState.enabled}
				<p class="section-desc">
					Enable AI features for recommendations, natural-language exploration, and artist summaries.
					Downloads ~{formatBytes(totalModelSize)} of AI models to your computer. All processing stays local.
				</p>
			{/if}
		</div>

		{#if aiState.enabled && (!generationExists || !embeddingExists) && !isDownloading}
			<!-- Download prompt -->
			<div class="download-prompt">
				<h3>Download AI Models</h3>
				<p>The following models are needed for local AI features:</p>
				<div class="model-list">
					{#each Object.values(MODELS) as model}
						<div class="model-item">
							<span class="model-name">{model.name}</span>
							<span class="model-size">{model.sizeLabel}</span>
							{#if (model.key === 'generation' && generationExists) || (model.key === 'embedding' && embeddingExists)}
								<span class="model-status downloaded">Downloaded</span>
							{:else}
								<span class="model-status pending">Pending</span>
							{/if}
						</div>
					{/each}
				</div>
				<button class="btn btn-primary" onclick={handleDownload}>
					Download Models (~{formatBytes(totalModelSize)})
				</button>
			</div>
		{/if}

		{#if isDownloading && downloadProgress}
			<!-- Download progress -->
			<div class="download-progress-section">
				<div class="download-label">
					Downloading {downloadingModelName}...
				</div>
				<div class="progress-bar">
					<div class="progress-fill" style="width: {downloadPercent}%"></div>
				</div>
				<div class="progress-info">
					<span>{formatBytes(downloadProgress.downloaded)} / {formatBytes(downloadProgress.total)}</span>
					<span>{downloadPercent}%</span>
				</div>
			</div>
		{:else if isDownloading}
			<div class="download-progress-section">
				<div class="download-label">
					Preparing download for {downloadingModelName}...
				</div>
				<div class="progress-bar">
					<div class="progress-fill indeterminate"></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Section 2: AI Provider (only when enabled) -->
	{#if aiState.enabled}
		<div class="settings-section">
			<h2>AI Provider</h2>

			<div class="provider-options">
				<label class="radio-option" class:selected={aiState.provider === 'local'}>
					<input
						type="radio"
						name="provider"
						value="local"
						checked={aiState.provider === 'local'}
						onchange={() => handleProviderChange('local')}
					/>
					<div class="radio-content">
						<span class="radio-label">Local (default)</span>
						<span class="radio-desc">Run AI models on your computer. Private and free.</span>
					</div>
				</label>

				<label class="radio-option" class:selected={aiState.provider === 'remote'}>
					<input
						type="radio"
						name="provider"
						value="remote"
						checked={aiState.provider === 'remote'}
						onchange={() => handleProviderChange('remote')}
					/>
					<div class="radio-content">
						<span class="radio-label">Remote API</span>
						<span class="radio-desc">Use an OpenAI-compatible API endpoint. Faster but requires API key.</span>
					</div>
				</label>
			</div>

			{#if aiState.provider === 'local'}
				<div class="status-box">
					{#if aiState.status === 'loading'}
						<span class="status-dot pulsing"></span>
						<span>Starting AI servers...</span>
					{:else if aiState.status === 'ready'}
						<span class="status-dot ready"></span>
						<span>AI is ready</span>
					{:else if aiState.status === 'error'}
						<span class="status-dot error"></span>
						<span>Error: {aiState.error}</span>
					{:else if aiState.status === 'downloading'}
						<span class="status-dot pulsing"></span>
						<span>Downloading models...</span>
					{/if}
				</div>
			{:else}
				<!-- Remote API configuration -->
				<div class="remote-config">
					<div class="form-field">
						<label for="api-base-url">API Base URL</label>
						<input
							id="api-base-url"
							type="text"
							bind:value={remoteBaseUrl}
							placeholder="https://api.openai.com"
						/>
					</div>
					<div class="form-field">
						<label for="api-key">API Key</label>
						<div class="key-input-row">
							<input
								id="api-key"
								type={showApiKey ? 'text' : 'password'}
								bind:value={remoteApiKey}
								placeholder="sk-..."
							/>
							<button
								class="btn btn-secondary btn-small"
								onclick={() => { showApiKey = !showApiKey; }}
							>
								{showApiKey ? 'Hide' : 'Show'}
							</button>
						</div>
					</div>
					<div class="form-field">
						<label for="api-model">Model Name</label>
						<input
							id="api-model"
							type="text"
							bind:value={remoteModel}
							placeholder="gpt-4o-mini"
						/>
					</div>
					<div class="form-actions">
						<button class="btn btn-primary" onclick={handleSaveRemote}>
							{remoteSaved ? 'Saved' : 'Save'}
						</button>
						{#if aiState.status === 'ready'}
							<span class="inline-status ready">Connected</span>
						{:else if aiState.status === 'error'}
							<span class="inline-status error">{aiState.error}</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- AI Summary Provider — redesigned for clarity (#29) -->
	<div class="settings-section">
		<h3 class="settings-section-title">AI Summary Provider</h3>
		<p class="settings-hint">
			Select the AI service that generates artist summaries. Each provider requires an API key.
			Local AI (above) generates embeddings and recommendations — this provider is for text summaries only.
		</p>

		<div class="provider-grid">
			{#each AI_PROVIDERS as provider (provider.id)}
				{@const isSelected = aiState.selectedProviderName === provider.id}
				<button
					class="provider-card"
					class:provider-card--selected={isSelected}
					onclick={() => handleProviderSelect(provider.id)}
					type="button"
				>
					<div class="provider-card-header">
						<span class="provider-card-name">{provider.label}</span>
						{#if provider.badge}
							<span class="provider-card-badge">{provider.badge}</span>
						{/if}
						{#if isSelected}
							<span class="provider-card-check">✓</span>
						{/if}
					</div>
					<p class="provider-card-hint">{provider.instructions}</p>
					{#if provider.affiliateUrl && isSelected}
						<span
							class="provider-card-key-btn"
							role="link"
							tabindex="0"
							onclick={(e) => { e.stopPropagation(); openAffiliateUrl(provider.affiliateUrl!); }}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); openAffiliateUrl(provider.affiliateUrl!); } }}
						>
							Get API key ↗
						</span>
					{/if}
				</button>
			{/each}
		</div>

		{#if aiState.selectedProviderName && aiState.status === 'ready'}
			<p class="provider-status-ready">✓ Connected and ready</p>
		{/if}
	</div>

	<!-- AI Auto-News: Auto-generate toggle -->
	<div class="settings-section">
		<h3 class="settings-section-title">Auto-generate on Artist Visit</h3>
		<label class="settings-toggle-row">
			<input
				type="checkbox"
				checked={aiState.autoGenerateOnVisit}
				onchange={handleAutoGenerateToggle}
			/>
			<span>Automatically generate AI summaries when visiting artist pages (requires API key configured above)</span>
		</label>
	</div>
{/if}

<style>
	.loading {
		color: var(--text-muted);
		font-size: 0.85rem;
		padding: var(--space-lg) 0;
	}

	.settings-section {
		padding: var(--space-lg);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		margin-bottom: var(--space-lg);
	}

	.settings-section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-header {
		margin-bottom: 0;
	}

	.section-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-desc {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: var(--space-sm) 0 0;
		line-height: 1.5;
		max-width: 560px;
	}

	/* Toggle switch */
	.toggle-switch {
		position: relative;
		display: inline-block;
		width: 40px;
		height: 22px;
		cursor: pointer;
	}

	.toggle-switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		inset: 0;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 11px;
		transition: background 0.2s, border-color 0.2s;
	}

	.toggle-slider::before {
		content: '';
		position: absolute;
		height: 16px;
		width: 16px;
		left: 2px;
		bottom: 2px;
		background: var(--text-muted);
		border-radius: 50%;
		transition: transform 0.2s, background 0.2s;
	}

	.toggle-switch input:checked + .toggle-slider {
		background: var(--bg-hover);
		border-color: var(--border-hover);
	}

	.toggle-switch input:checked + .toggle-slider::before {
		transform: translateX(18px);
		background: var(--text-accent);
	}

	/* Download prompt */
	.download-prompt {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--card-radius);
	}

	.download-prompt h3 {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.download-prompt p {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-md);
	}

	.model-list {
		margin-bottom: var(--space-md);
	}

	.model-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xs) 0;
		font-size: 0.8rem;
	}

	.model-name {
		color: var(--text-primary);
		flex: 1;
	}

	.model-size {
		color: var(--text-muted);
		margin: 0 var(--space-md);
	}

	.model-status {
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 3px;
	}

	.model-status.downloaded {
		color: #4ade80;
		background: rgba(74, 222, 128, 0.1);
	}

	.model-status.pending {
		color: var(--text-muted);
		background: var(--bg-hover);
	}

	/* Download progress */
	.download-progress-section {
		margin-top: var(--space-lg);
	}

	.download-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin-bottom: var(--space-xs);
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--progress-bg);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--text-accent);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.progress-fill.indeterminate {
		width: 30%;
		animation: indeterminate 1.5s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(400%); }
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		margin-top: var(--space-xs);
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* Provider options */
	.provider-options {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.radio-option {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.radio-option:hover {
		border-color: var(--border-default);
	}

	.radio-option.selected {
		border-color: var(--border-hover);
	}

	.radio-option input {
		margin-top: 3px;
		accent-color: var(--text-accent);
	}

	.radio-content {
		display: flex;
		flex-direction: column;
	}

	.radio-label {
		font-size: 0.85rem;
		color: var(--text-primary);
		font-weight: 500;
	}

	.radio-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: 2px;
	}

	/* Status box */
	.status-box {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-elevated);
		border-radius: var(--card-radius);
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-dot.ready {
		background: #4ade80;
	}

	.status-dot.error {
		background: #ef4444;
	}

	.status-dot.pulsing {
		background: var(--text-muted);
		animation: pulse-dot 1.5s ease-in-out infinite;
	}

	@keyframes pulse-dot {
		0%, 100% { opacity: 0.3; }
		50% { opacity: 1; }
	}

	/* Remote config */
	.remote-config {
		margin-top: var(--space-sm);
	}

	.form-field {
		margin-bottom: var(--space-md);
	}

	.form-field label {
		display: block;
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin-bottom: var(--space-xs);
		font-weight: 500;
	}

	.form-field input {
		width: 100%;
		padding: 8px 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: var(--input-radius);
		color: var(--text-primary);
		font-size: 0.85rem;
		font-family: var(--font-sans);
		outline: none;
		transition: border-color 0.15s;
	}

	.form-field input:focus {
		border-color: var(--border-hover);
	}

	.form-field input::placeholder {
		color: var(--text-muted);
	}

	.key-input-row {
		display: flex;
		gap: var(--space-sm);
	}

	.key-input-row input {
		flex: 1;
	}

	.form-actions {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.inline-status {
		font-size: 0.8rem;
	}

	.inline-status.ready {
		color: #4ade80;
	}

	.inline-status.error {
		color: #ef4444;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 6px 14px;
		border: none;
		border-radius: var(--card-radius);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
		font-family: var(--font-sans);
	}

	.btn-primary {
		background: var(--bg-elevated);
		color: var(--text-primary);
		border: 1px solid var(--border-default);
	}

	.btn-primary:hover {
		background: var(--bg-hover);
		border-color: var(--border-hover);
	}

	.btn-secondary {
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.btn-secondary:hover {
		color: var(--text-primary);
		border-color: var(--border-default);
	}

	.btn-small {
		padding: 6px 10px;
		font-size: 0.75rem;
	}

	/* AI Summary Provider */
	.settings-section-title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 var(--space-xs);
	}

	.settings-hint {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0 0 var(--space-sm);
		line-height: 1.5;
	}

	.provider-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-sm, 8px);
		margin-top: var(--space-sm, 8px);
	}

	.provider-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: var(--space-sm, 8px) var(--space-md, 12px);
		background: var(--bg-surface, var(--bg-4));
		border: 1px solid var(--border-subtle, var(--b-2));
		border-radius: var(--card-radius, var(--r));
		cursor: pointer;
		text-align: left;
		transition: border-color 0.1s, background 0.1s;
	}

	.provider-card:hover {
		border-color: var(--acc);
		background: var(--bg-3, #1a1a1a);
	}

	.provider-card--selected {
		border-color: var(--acc);
		background: var(--bg-3, #1a1a1a);
	}

	.provider-card-header {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.provider-card-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--t-1, var(--text-primary));
		flex: 1;
	}

	.provider-card-badge {
		font-size: 9px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 1px 5px;
		background: var(--bg-4);
		color: var(--t-3);
		border: 1px solid var(--b-2);
		border-radius: var(--r);
	}

	.provider-card-check {
		font-size: 11px;
		color: var(--acc);
		font-weight: 700;
	}

	.provider-card-hint {
		font-size: 10px;
		color: var(--t-3, var(--text-secondary));
		line-height: 1.4;
		margin: 0;
	}

	.provider-card-key-btn {
		font-size: 10px;
		color: var(--acc);
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px 0;
		text-align: left;
		font-family: inherit;
	}

	.provider-card-key-btn:hover {
		text-decoration: underline;
	}

	.provider-status-ready {
		margin-top: 8px;
		font-size: 11px;
		color: var(--t-3);
	}

	.settings-toggle-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--text-primary);
	}

	.settings-toggle-row input[type="checkbox"] {
		margin-top: 0.2rem;
		flex-shrink: 0;
		accent-color: var(--text-accent);
	}
</style>
