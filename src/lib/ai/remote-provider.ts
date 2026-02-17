/**
 * Remote AI provider — communicates with an OpenAI-compatible API endpoint.
 *
 * Works with OpenAI, Anthropic (via proxy), and any other provider that
 * implements the OpenAI chat completions / embeddings API format.
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

export class RemoteAiProvider implements AiProvider {
	private apiKey: string;
	private baseUrl: string;
	private model: string;

	constructor(apiKey: string, baseUrl: string, model: string) {
		// Strip trailing slash from base URL for consistent joining
		this.apiKey = apiKey;
		this.baseUrl = baseUrl.replace(/\/+$/, '');
		this.model = model;
	}

	async complete(prompt: string, options?: CompletionOptions): Promise<string> {
		const messages: Array<{ role: string; content: string }> = [];

		if (options?.systemPrompt) {
			messages.push({ role: 'system', content: options.systemPrompt });
		}
		messages.push({ role: 'user', content: prompt });

		try {
			const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`
				},
				body: JSON.stringify({
					model: this.model,
					messages,
					max_tokens: options?.maxTokens ?? 1024,
					temperature: options?.temperature ?? 0.7
				})
			});

			if (!response.ok) {
				console.error(`Remote AI completion failed: ${response.status} ${response.statusText}`);
				return '';
			}

			const data: ChatCompletionResponse = await response.json();
			return data?.choices?.[0]?.message?.content ?? '';
		} catch (err) {
			console.error('Remote AI completion error:', err);
			return '';
		}
	}

	async embed(texts: string[]): Promise<number[][]> {
		if (texts.length === 0) return [];

		try {
			const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${this.apiKey}`
				},
				body: JSON.stringify({
					model: this.model,
					input: texts
				})
			});

			if (!response.ok) {
				console.error(`Remote AI embedding failed: ${response.status} ${response.statusText}`);
				return texts.map(() => []);
			}

			const data: EmbeddingResponse = await response.json();
			return (data?.data ?? []).map((item) => item.embedding ?? []);
		} catch (err) {
			console.error('Remote AI embedding error:', err);
			return texts.map(() => []);
		}
	}

	async isReady(): Promise<boolean> {
		// Remote provider is considered ready if configured with an API key
		return this.apiKey.length > 0;
	}
}
