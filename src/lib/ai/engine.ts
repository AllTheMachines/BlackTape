/**
 * AI Provider interface and state management.
 *
 * This is the core abstraction that all AI features use to interact with
 * language models. Whether running locally via llama-server or remotely
 * via OpenAI-compatible API, callers use the same interface.
 */

export interface CompletionOptions {
	maxTokens?: number;
	temperature?: number;
	systemPrompt?: string;
}

export interface AiProvider {
	/** Send a prompt and get a text completion back. */
	complete(prompt: string, options?: CompletionOptions): Promise<string>;

	/** Generate embeddings for one or more texts. */
	embed(texts: string[]): Promise<number[][]>;

	/** Check if the provider is ready to accept requests. */
	isReady(): Promise<boolean>;
}

// Module-level active provider state
let activeProvider: AiProvider | null = null;

/** Set the active AI provider (or null to disable). */
export function setAiProvider(provider: AiProvider | null): void {
	activeProvider = provider;
}

/** Get the currently active AI provider (null if none configured). */
export function getAiProvider(): AiProvider | null {
	return activeProvider;
}
