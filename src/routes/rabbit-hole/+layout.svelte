<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { loadTrail, trailState, jumpToTrailIndex } from '$lib/rabbit-hole/trail.svelte';
	import { aiState } from '$lib/ai/state.svelte';
	import { getAiProvider } from '$lib/ai/engine';
	import { INJECTION_GUARD, externalContent } from '$lib/ai/prompts';

	let { children } = $props();

	onMount(() => {
		loadTrail();
	});

	function handleExit() {
		goto('/discover');
	}

	function handleTrailClick(index: number) {
		const item = trailState.items[index];
		if (!item) return;
		jumpToTrailIndex(index);
		const route = item.type === 'artist'
			? `/rabbit-hole/artist/${item.slug}`
			: `/rabbit-hole/tag/${item.slug}`;
		goto(route, { keepFocus: true, noScroll: true });
	}

	// --- AI companion ---
	interface ChatMessage { role: 'user' | 'assistant'; text: string; }
	let chatMessages = $state<ChatMessage[]>([]);
	let chatBodyEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const _ = chatMessages.length;
		const __ = chatLoading;
		tick().then(() => { if (chatBodyEl) chatBodyEl.scrollTop = chatBodyEl.scrollHeight; });
	});
	let chatInput = $state('');
	let chatLoading = $state(false);
	const MAX_CHAT_MESSAGES = 6;

	// Helper intro message — resets on each new page, no API call
	let helperMessage = $state<string | null>(null);

	$effect(() => {
		const current = trailState.items[trailState.currentIndex];
		chatMessages = [];
		if (!current) { helperMessage = null; return; }
		if (current.type === 'artist') {
			helperMessage = `You're exploring ${current.name}. Click tags to dive into related genres, or hit Continue → to keep going. Ask me anything about them.`;
		} else {
			helperMessage = `You're browsing ${current.name} music. Click an artist chip to explore them, or tap a tag to go deeper. Ask me what defines this sound.`;
		}
	});

	// Suggestion chips — reset when the current trail item changes
	let suggestions = $derived.by(() => {
		const current = trailState.items[trailState.currentIndex];
		if (!current) return [];
		if (current.type === 'artist') {
			return [
				`What does ${current.name} sound like?`,
				`What's their most essential album?`,
				`Who should I explore next?`,
			];
		} else {
			return [
				`What defines ${current.name} music?`,
				`Key artists in ${current.name}?`,
				`What era did this emerge from?`,
			];
		}
	});

	function buildRhContext(): string {
		const current = trailState.items[trailState.currentIndex];
		if (!current) return '';
		const parts: string[] = [];
		if (current.type === 'artist') {
			parts.push(`The user is exploring artist: ${current.name}`);
		} else {
			parts.push(`The user is browsing music tagged: ${current.name}`);
		}
		if (trailState.items.length > 1) {
			parts.push(`Trail: ${trailState.items.map(i => i.name).join(' → ')}`);
		}
		return parts.join('. ');
	}

	async function sendChatMessage(text?: string) {
		const msg = (text ?? chatInput).trim();
		if (!msg || chatLoading) return;
		const provider = getAiProvider();
		if (!provider) return;

		chatInput = '';
		chatMessages = [...chatMessages, { role: 'user' as const, text: msg }].slice(-MAX_CHAT_MESSAGES);
		chatLoading = true;

		try {
			const rhContext = buildRhContext();
			const contextSuffix = rhContext ? ` ${externalContent(rhContext)}` : '';
			const systemPrompt =
				INJECTION_GUARD +
				' You are a music companion helping someone explore music. Answer concisely.' +
				' You may include external links using markdown: [text](https://...).' +
				contextSuffix;
			const response = await provider.complete(msg, {
				systemPrompt,
				temperature: 0.8,
				maxTokens: 512
			});
			chatMessages = [...chatMessages, { role: 'assistant' as const, text: response }].slice(-MAX_CHAT_MESSAGES);
		} catch {
			chatMessages = [...chatMessages, { role: 'assistant' as const, text: 'Something went wrong. Try again.' }].slice(-MAX_CHAT_MESSAGES);
		} finally {
			chatLoading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendChatMessage();
		}
	}

	// Parse markdown links from AI response into segments
	interface TextSegment { type: 'text'; content: string; }
	interface LinkSegment { type: 'link'; content: string; href: string; internal: boolean; }
	type Segment = TextSegment | LinkSegment;

	function parseMessage(text: string): Segment[] {
		const segments: Segment[] = [];
		const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
		let last = 0;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(text)) !== null) {
			if (match.index > last) segments.push({ type: 'text', content: text.slice(last, match.index) });
			const href = match[2];
			segments.push({ type: 'link', content: match[1], href, internal: href.startsWith('/') });
			last = regex.lastIndex;
		}
		if (last < text.length) segments.push({ type: 'text', content: text.slice(last) });
		return segments;
	}

	async function handleLink(href: string) {
		try {
			const { open } = await import('@tauri-apps/plugin-shell');
			await open(href);
		} catch {
			window.open(href, '_blank');
		}
	}
</script>

<div class="rabbit-hole-shell">
	<div class="rh-topbar">
		<button class="rh-exit" onclick={handleExit} aria-label="Exit Rabbit Hole">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="15 18 9 12 15 6" />
			</svg>
			Exit
		</button>
		<span class="rh-title">Rabbit Hole</span>
	</div>

	{#if trailState.items.length > 0}
		<div class="rh-trail" role="navigation" aria-label="Exploration trail">
			{#each trailState.items as item, i}
				<button
					class="rh-trail-item"
					class:active={i === trailState.currentIndex}
					onclick={() => handleTrailClick(i)}
					title={item.name}
				>
					{#if item.type === 'tag'}
						<span class="rh-trail-icon">◈</span>
					{/if}
					{item.name}
				</button>
				{#if i < trailState.items.length - 1}
					<span class="rh-trail-sep" aria-hidden="true">›</span>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="rh-body">
		<div class="rh-content">
			{@render children()}
		</div>

		{#if aiState.status === 'ready'}
			<div class="rh-ai-col">
			<div class="rh-ai-panel">
				<h4 class="rh-ai-header">AI Companion</h4>

				<div class="rh-chat-body" bind:this={chatBodyEl}>
					{#if chatMessages.length > 0}
						{#each chatMessages as msg}
							<div class="rh-chat-msg" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
								{#if msg.role === 'assistant'}
									{#each parseMessage(msg.text) as seg}
										{#if seg.type === 'link'}
											<button class="rh-msg-link" onclick={() => handleLink(seg.href)}>{seg.content}</button>
										{:else}
											{seg.content}
										{/if}
									{/each}
								{:else}
									{msg.text}
								{/if}
							</div>
						{/each}
						{#if chatLoading}
							<div class="rh-chat-msg assistant rh-chat-loading">...</div>
						{/if}
					{:else}
						{#if helperMessage}
							<p class="rh-helper-msg">{helperMessage}</p>
						{/if}
						{#if suggestions.length > 0}
							<div class="rh-suggestions">
								{#each suggestions as s}
									<button class="rh-suggestion" onclick={() => sendChatMessage(s)}>{s}</button>
								{/each}
							</div>
						{/if}
					{/if}
				</div>

				<div class="rh-chat-input-row">
					<input
						type="text"
						class="rh-chat-input"
						placeholder="Ask me anything..."
						bind:value={chatInput}
						onkeydown={handleKeydown}
						disabled={chatLoading}
					/>
					<button
						class="rh-chat-send"
						onclick={() => sendChatMessage()}
						disabled={chatLoading || !chatInput.trim()}
						aria-label="Send"
					>&rarr;</button>
				</div>
			</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.rabbit-hole-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--bg-1);
		color: var(--t-1);
		overflow: hidden;
	}

	.rh-topbar {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: 0 var(--space-lg);
		height: 44px;
		border-bottom: 1px solid var(--b-1);
		flex-shrink: 0;
	}

	.rh-exit {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: none;
		color: var(--t-3);
		cursor: pointer;
		font-size: 0.8125rem;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: color 0.15s;
	}

	.rh-exit:hover {
		color: var(--t-1);
		background: var(--bg-3);
	}

	.rh-title {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--t-3);
		margin-right: auto;
	}

	.rh-trail {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 6px var(--space-lg);
		overflow-x: auto;
		scrollbar-width: none;
		border-bottom: 1px solid var(--b-1);
		flex-shrink: 0;
	}

	.rh-trail::-webkit-scrollbar {
		display: none;
	}

	.rh-trail-item {
		display: flex;
		align-items: center;
		gap: 4px;
		background: none;
		border: 1px solid transparent;
		color: var(--t-3);
		cursor: pointer;
		font-size: 0.75rem;
		padding: 2px 8px;
		border-radius: 999px;
		white-space: nowrap;
		transition: color 0.15s, border-color 0.15s;
		flex-shrink: 0;
	}

	.rh-trail-item:hover {
		color: var(--t-1);
		border-color: var(--b-2);
	}

	.rh-trail-item.active {
		color: var(--t-1);
		border-color: var(--acc);
		background: color-mix(in srgb, var(--acc) 12%, transparent);
	}

	.rh-trail-sep {
		color: var(--t-4);
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.rh-trail-icon {
		font-size: 0.7rem;
		opacity: 0.7;
	}

	/* Body: main content + AI panel side by side */
	.rh-body {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.rh-content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}

	/* Full-height right column — holds the panel at the bottom */
	.rh-ai-col {
		width: 220px;
		flex-shrink: 0;
		border-left: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
	}

	/* AI companion panel — fixed 50vh, anchored to bottom of column */
	.rh-ai-panel {
		height: 50vh;
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-surface);
		padding: var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.rh-ai-header {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		margin: 0 0 var(--space-xs) 0;
	}

	.rh-ai-hint {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-style: italic;
		margin: var(--space-xs) 0 0 0;
	}

	.rh-chat-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: var(--space-xs);
	}

	.rh-chat-msg {
		font-size: 0.8rem;
		line-height: 1.4;
		padding: 4px 6px;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.rh-chat-msg.user {
		color: var(--text-primary);
		background: var(--bg-hover);
		align-self: flex-end;
		max-width: 90%;
	}

	.rh-chat-msg.assistant {
		color: var(--text-secondary);
		background: var(--bg-elevated);
		align-self: flex-start;
		max-width: 95%;
	}

	.rh-chat-loading {
		color: var(--text-muted);
		font-style: italic;
	}

	.rh-helper-msg {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.45;
		margin: var(--space-xs) 0 0 0;
	}

	.rh-suggestions {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: var(--space-xs);
	}

	.rh-suggestion {
		background: none;
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		font-size: 0.7rem;
		padding: 4px 8px;
		cursor: pointer;
		text-align: left;
		line-height: 1.3;
		transition: border-color 0.15s, color 0.15s;
		font-family: inherit;
	}

	.rh-suggestion:hover {
		border-color: var(--text-accent);
		color: var(--text-primary);
	}

	.rh-msg-link {
		background: none;
		border: none;
		color: var(--text-accent);
		font-size: inherit;
		font-family: inherit;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
		text-underline-offset: 2px;
		display: inline;
	}

	.rh-msg-link:hover {
		opacity: 0.8;
	}

	.rh-chat-input-row {
		display: flex;
		gap: 4px;
		margin-top: var(--space-xs);
	}

	.rh-chat-input {
		flex: 1;
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 0.75rem;
		padding: 4px 6px;
		border-radius: 0;
		outline: none;
		font-family: inherit;
		min-width: 0;
	}

	.rh-chat-input:focus {
		border-color: var(--text-accent);
	}

	.rh-chat-input:disabled {
		opacity: 0.5;
	}

	.rh-chat-send {
		background: var(--bg-elevated);
		border: 1px solid var(--border-subtle);
		color: var(--text-accent);
		font-size: 0.75rem;
		padding: 4px 8px;
		cursor: pointer;
		border-radius: 0;
		flex-shrink: 0;
	}

	.rh-chat-send:hover:not(:disabled) {
		background: var(--bg-hover);
	}

	.rh-chat-send:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
