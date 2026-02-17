/**
 * Model download orchestration for local AI.
 *
 * Manages GGUF model downloads from HuggingFace with progress tracking.
 * Uses Tauri's Channel IPC for streaming progress updates from Rust.
 */

import { Channel, invoke } from '@tauri-apps/api/core';

export interface ModelInfo {
	key: string;
	name: string;
	filename: string;
	url: string;
	sizeBytes: number;
	sizeLabel: string;
}

/** Models used for local AI inference. */
export const MODELS: Record<string, ModelInfo> = {
	generation: {
		key: 'generation',
		name: 'Qwen2.5 3B (Generation)',
		filename: 'qwen2.5-3b-instruct-q4_k_m.gguf',
		url: 'https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf',
		sizeBytes: 2_050_000_000,
		sizeLabel: '~2.0 GB'
	},
	embedding: {
		key: 'embedding',
		name: 'Nomic Embed v1.5 (Embedding)',
		filename: 'nomic-embed-text-v1.5.Q8_0.gguf',
		url: 'https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf',
		sizeBytes: 140_000_000,
		sizeLabel: '~137 MB'
	}
};

export interface DownloadProgressEvent {
	downloaded: number;
	total: number;
}

/**
 * Download a model file with progress reporting.
 * Returns the full file path on success.
 */
export async function downloadModel(
	modelKey: string,
	onProgress?: (progress: DownloadProgressEvent) => void
): Promise<string> {
	const model = MODELS[modelKey];
	if (!model) throw new Error(`Unknown model: ${modelKey}`);

	const channel = new Channel<DownloadProgressEvent>();
	if (onProgress) {
		channel.onmessage = onProgress;
	}

	const path = await invoke<string>('download_model', {
		url: model.url,
		filename: model.filename,
		onProgress: channel
	});

	return path;
}

/**
 * Check if a model file exists in the models directory.
 */
export async function checkModelExists(modelKey: string): Promise<boolean> {
	const model = MODELS[modelKey];
	if (!model) return false;

	return await invoke<boolean>('check_model_exists', {
		filename: model.filename
	});
}

/**
 * Get the full path to the models directory.
 */
export async function getModelsDir(): Promise<string> {
	return await invoke<string>('get_models_dir');
}
