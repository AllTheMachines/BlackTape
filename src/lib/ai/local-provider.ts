/**
 * Local AI provider — communicates with llama-server via OpenAI-compatible HTTP API.
 *
 * The llama-server sidecar is managed by the Rust backend (see ai/sidecar.rs).
 * This provider just talks to it over HTTP on localhost.
 */

import type { AiProvider, CompletionOptions } from './engine';

/** OpenAI-compatible chat completion response shape. */
interface ChatCompletionResponse {
	choices?: Array<{ message?: { content?: string } }>;
}

/** OpenAI-compatible embeddings response shape. */
interface EmbeddingResponse {
	data?: Array<{ embedding?: number[] }>;
}

const GENERATION_PORT = 8847;
const EMBEDDING_PORT = 8848;

export class LocalAiProvider implements AiProvider {
	private generationUrl: string;
	private embeddingUrl: string;

	constructor(generationPort = GENERATION_PORT, embeddingPort = EMBEDDING_PORT) {
		this.generationUrl = `http://127.0.0.1:${generationPort}`;
		this.embeddingUrl = `http://127.0.0.1:${embeddingPort}`;
	}

	async complete(prompt: string, options?: CompletionOptions): Promise<string> {
		const messages: Array<{ role: string; content: string }> = [];

		if (options?.systemPrompt) {
			messages.push({ role: 'system', content: options.systemPrompt });
		}
		messages.push({ role: 'user', content: prompt });

		try {
			const response = await fetch(`${this.generationUrl}/v1/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages,
					max_tokens: options?.maxTokens ?? 1024,
					temperature: options?.temperature ?? 0.7
				})
			});

			if (!response.ok) {
				console.error(`Local AI completion failed: ${response.status} ${response.statusText}`);
				return '';
			}

			const data: ChatCompletionResponse = await response.json();
			return data?.choices?.[0]?.message?.content ?? '';
		} catch (err) {
			console.error('Local AI completion error:', err);
			return '';
		}
	}

	async embed(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) return [];

		try {
			const response = await fetch(`${this.embeddingUrl}/v1/embeddings`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					input: texts
				})
			});

			if (!response.ok) {
				console.error(`Local AI embedding failed: ${response.status} ${response.statusText}`);
				return texts.map(() => []);
			}

			const data: EmbeddingResponse = await response.json();
			return (data?.data ?? []).map((item) => item.embedding ?? []);
		} catch (err) {
			console.error('Local AI embedding error:', err);
			return texts.map(() => []);
		}
	}

	async isReady(): Promise<boolean> {
		try {
			const response = await fetch(`${this.generationUrl}/health`);
			return response.ok;
		} catch {
			return false;
		}
	}
}
