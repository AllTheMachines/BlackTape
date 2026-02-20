/**
 * Reactive AI state management using Svelte 5 runes.
 *
 * Tracks AI enabled/disabled status, model download progress,
 * server readiness, and provider configuration. All AI features
 * read from this state to determine what's available.
 */

import { setAiProvider } from './engine';
import { LocalAiProvider } from './local-provider';
import { RemoteAiProvider } from './remote-provider';

export type AiStatus = 'disabled' | 'downloading' | 'loading' | 'ready' | 'error';

export interface AiState {
	enabled: boolean;
	status: AiStatus;
	provider: 'local' | 'remote';
	apiKey: string;
	apiBaseUrl: string;
	apiModel: string;
	downloadProgress: { downloaded: number; total: number } | null;
	downloadingModel: string;
	generationReady: boolean;
	embeddingReady: boolean;
	error: string | null;
}

/** Global reactive AI state. */
export const aiState: AiState = $state({
	enabled: false,
	status: 'disabled',
	provider: 'local',
	apiKey: '',
	apiBaseUrl: '',
	apiModel: '',
	downloadProgress: null,
	downloadingModel: '',
	generationReady: false,
	embeddingReady: false,
	error: null
});

/** Dynamically import Tauri invoke to avoid breaking web builds. */
async function getInvoke(): Promise<typeof import('@tauri-apps/api/core').invoke> {
	const { invoke } = await import('@tauri-apps/api/core');
	return invoke;
}

/**
 * Load AI settings from taste.db into reactive state.
 * Called on app mount and settings page mount.
 */
export async function loadAiSettings(): Promise<void> {
	try {
		const invoke = await getInvoke();
		const settings = await invoke<Record<string, string>>('get_all_ai_settings');

		aiState.enabled = settings['enabled'] === 'true';
		aiState.provider = (settings['provider'] as 'local' | 'remote') || 'local';
		aiState.apiKey = settings['api_key'] || '';
		aiState.apiBaseUrl = settings['api_base_url'] || '';
		aiState.apiModel = settings['api_model'] || '';

		if (!aiState.enabled) {
			aiState.status = 'disabled';
		}
	} catch (err) {
		console.error('Failed to load AI settings:', err);
	}
}

/**
 * Save a single AI setting to taste.db and update local state.
 */
export async function saveAiSetting(key: string, value: string): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('set_ai_setting', { key, value });

		// Update local state to match
		switch (key) {
			case 'enabled':
				aiState.enabled = value === 'true';
				break;
			case 'provider':
				aiState.provider = value as 'local' | 'remote';
				break;
			case 'api_key':
				aiState.apiKey = value;
				break;
			case 'api_base_url':
				aiState.apiBaseUrl = value;
				break;
			case 'api_model':
				aiState.apiModel = value;
				break;
		}
	} catch (err) {
		console.error(`Failed to save AI setting ${key}:`, err);
	}
}

/**
 * Initialize AI: check models, start servers, poll health, set provider.
 * Called when AI is toggled on or on app startup if previously enabled.
 */
export async function initializeAi(): Promise<void> {
	if (aiState.provider === 'remote') {
		// Remote provider is ready immediately if configured
		if (aiState.apiKey && aiState.apiBaseUrl && aiState.apiModel) {
			const provider = new RemoteAiProvider(aiState.apiKey, aiState.apiBaseUrl, aiState.apiModel);
			setAiProvider(provider);
			aiState.status = 'ready';
			aiState.generationReady = true;
			aiState.embeddingReady = true;
		} else {
			aiState.status = 'error';
			aiState.error = 'Remote API not fully configured';
		}
		return;
	}

	// Local provider: check models, start sidecars, poll health
	aiState.status = 'loading';
	aiState.error = null;

	try {
		const invoke = await getInvoke();
		const { checkModelExists } = await import('./model-manager');

		const genExists = await checkModelExists('generation');
		const embedExists = await checkModelExists('embedding');

		if (!genExists || !embedExists) {
			aiState.status = 'error';
			aiState.error = 'Models not downloaded. Please download models first.';
			return;
		}

		// Save model paths to taste.db so sidecar.rs can read them
		const { MODELS, getModelsDir } = await import('./model-manager');
		const modelsDir = await getModelsDir();
		const genPath = `${modelsDir}/${MODELS.generation.filename}`.replace(/\\/g, '/');
		const embedPath = `${modelsDir}/${MODELS.embedding.filename}`.replace(/\\/g, '/');

		await invoke('set_ai_setting', { key: 'local_gen_model_path', value: genPath });
		await invoke('set_ai_setting', { key: 'local_embed_model_path', value: embedPath });

		// Start sidecar servers
		await invoke<string>('start_generation_server');
		await invoke<string>('start_embedding_server');

		// Poll health until both servers are ready (max 180s — large models need time to load)
		const startTime = Date.now();
		const timeout = 180_000;
		const pollInterval = 1000;

		while (Date.now() - startTime < timeout) {
			try {
				// Check if sidecar processes are still alive
				const status = await invoke<{
					generation_running: boolean;
					embedding_running: boolean;
				}>('get_ai_status');

				if (!status.generation_running && !status.embedding_running) {
					aiState.status = 'error';
					aiState.error = 'AI servers crashed during startup. Check that models downloaded correctly.';
					return;
				}

				const [genHealth, embedHealth] = await Promise.all([
					fetch('http://127.0.0.1:8847/health').then((r) => r.ok).catch(() => false),
					fetch('http://127.0.0.1:8848/health').then((r) => r.ok).catch(() => false)
				]);

				aiState.generationReady = genHealth;
				aiState.embeddingReady = embedHealth;

				if (genHealth && embedHealth) {
					break;
				}
			} catch {
				// Server not ready yet
			}

			await new Promise((resolve) => setTimeout(resolve, pollInterval));
		}

		if (aiState.generationReady && aiState.embeddingReady) {
			const provider = new LocalAiProvider();
			setAiProvider(provider);
			aiState.status = 'ready';
		} else {
			aiState.status = 'error';
			const elapsed = Math.round((Date.now() - startTime) / 1000);
			const genStatus = aiState.generationReady ? 'ready' : 'not responding';
			const embedStatus = aiState.embeddingReady ? 'ready' : 'not responding';
			aiState.error = `AI servers failed to start within ${elapsed}s (generation: ${genStatus}, embedding: ${embedStatus})`;
		}
	} catch (err) {
		aiState.status = 'error';
		aiState.error = err instanceof Error ? err.message : String(err);
		console.error('Failed to initialize AI:', err);
	}
}

/**
 * Shut down AI: stop servers, clear provider, reset state.
 */
export async function shutdownAi(): Promise<void> {
	try {
		const invoke = await getInvoke();
		await invoke('stop_ai_servers');
	} catch (err) {
		console.error('Failed to stop AI servers:', err);
	}

	setAiProvider(null);
	aiState.status = 'disabled';
	aiState.generationReady = false;
	aiState.embeddingReady = false;
	aiState.error = null;
	aiState.downloadProgress = null;
}
