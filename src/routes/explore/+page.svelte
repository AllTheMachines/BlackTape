<script lang="ts">
	import { onMount } from 'svelte';
	import { isTauri } from '$lib/platform';
	import { getAiProvider } from '$lib/ai/engine';
	import { PROMPTS, INJECTION_GUARD } from '$lib/ai/prompts';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import ExploreResult from '$lib/components/ExploreResult.svelte';
	import oracleFigure from '$lib/assets/oracle-banner.png';

	let tauriMode = $state(false);
	let aiReady = $state(false);
	let query = $state('');
	let results = $state<
		Array<{ number: number; artistName: string; description: string; slug: string | null }>
	>([]);
	let isLoading = $state(false);
	let errorMessage = $state('');
	let refinementInput = $state('');
	let originalQuery = $state('');
	let refinementCount = $state(0);
	let hasSearched = $state(false);
	let conversationHistory = $state<Array<{ role: 'user' | 'refinement'; text: string }>>([]);
	const MAX_REFINEMENTS = 5;

	let queryInputEl: HTMLInputElement | undefined = $state();

	/** Top 3 taste tags for the subtitle hint. */
	let topTasteTags = $derived(
		tasteProfile.tags
			.sort((a, b) => b.weight - a.weight)
			.slice(0, 3)
			.map((t) => t.tag)
	);

	/** Top 10 taste tags for the prompt context. */
	let tasteDescription = $derived(
		tasteProfile.tags
			.sort((a, b) => b.weight - a.weight)
			.slice(0, 10)
			.map((t) => t.tag)
			.join(', ')
	);

	onMount(() => {
		tauriMode = isTauri();
		const provider = getAiProvider();
		aiReady = provider !== null;
	});

	/**
	 * Parse AI response into structured results.
	 * Expects numbered lines: "N. **Artist Name** -- Description"
	 */
	function parseResponse(
		text: string
	): Array<{ artistName: string; description: string }> {
		const parsed: Array<{ artistName: string; description: string }> = [];
		const lines = text.split('\n');

		for (const line of lines) {
			// Match: "N. **Artist Name** -- Description" or "N. Artist Name -- Description"
			const match = line.match(
				/^\d+\.\s*\*{0,2}([^*\n]+?)\*{0,2}\s*[—\-–]+\s*(.+)/
			);
			if (match) {
				const artistName = match[1].trim();
				const description = match[2].trim();
				if (artistName && description) {
					parsed.push({ artistName, description });
				}
			}
		}

		return parsed;
	}

	/**
	 * Try to match a parsed artist name against mercury.db.
	 * Returns slug if found, null otherwise.
	 */
	async function matchArtistInDb(
		name: string
	): Promise<string | null> {
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { searchArtists } = await import('$lib/db/queries');
			const db = await getProvider();
			const matches = await searchArtists(db, name, 3);
			const exact = matches.find(
				(m) => m.name.toLowerCase() === name.toLowerCase()
			);
			return exact ? exact.slug : null;
		} catch {
			return null;
		}
	}

	/** Build a summary of current results for the refine prompt. */
	function buildResultsSummary(): string {
		return results
			.map((r) => `${r.number}. ${r.artistName} — ${r.description}`)
			.join('\n');
	}

	/** Submit the initial query. */
	async function handleQuery() {
		const trimmed = query.trim();
		if (!trimmed || isLoading) return;

		const provider = getAiProvider();
		if (!provider) {
			aiReady = false;
			return;
		}

		isLoading = true;
		errorMessage = '';
		results = [];
		refinementCount = 0;
		refinementInput = '';
		originalQuery = trimmed;
		conversationHistory = [{ role: 'user', text: trimmed }];

		try {
			// Build prompt: taste-aware if taste data exists
			const prompt =
				tasteDescription.length > 0
					? PROMPTS.nlExploreWithTaste(trimmed, tasteDescription)
					: PROMPTS.nlExplore(trimmed);

			const response = await provider.complete(prompt, {
				systemPrompt: INJECTION_GUARD,
				temperature: 0.8,
				maxTokens: 1024
			});

			const parsed = parseResponse(response);

			if (parsed.length === 0) {
				errorMessage =
					'Could not parse recommendations. Try rephrasing your query.';
				return;
			}

			// Match each artist in the DB
			const matched = await Promise.all(
				parsed.map(async (item, idx) => ({
					number: idx + 1,
					artistName: item.artistName,
					description: item.description,
					slug: await matchArtistInDb(item.artistName)
				}))
			);

			results = matched;
			hasSearched = true;
		} catch (err) {
			console.error('Explore query failed:', err);
			errorMessage =
				'Something went wrong generating recommendations. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	/** Submit a refinement query. */
	async function handleRefinement() {
		const trimmed = refinementInput.trim();
		if (!trimmed || isLoading || refinementCount >= MAX_REFINEMENTS)
			return;

		const provider = getAiProvider();
		if (!provider) {
			aiReady = false;
			return;
		}

		isLoading = true;
		errorMessage = '';

		try {
			const previousSummary = buildResultsSummary();
			const prompt = PROMPTS.nlRefine(
				originalQuery,
				previousSummary,
				trimmed
			);

			const response = await provider.complete(prompt, {
				systemPrompt: INJECTION_GUARD,
				temperature: 0.8,
				maxTokens: 1024
			});

			const parsed = parseResponse(response);

			if (parsed.length === 0) {
				errorMessage =
					'Could not parse refined recommendations. Try rephrasing.';
				return;
			}

			const matched = await Promise.all(
				parsed.map(async (item, idx) => ({
					number: idx + 1,
					artistName: item.artistName,
					description: item.description,
					slug: await matchArtistInDb(item.artistName)
				}))
			);

			results = matched;
			refinementCount++;
			conversationHistory = [...conversationHistory, { role: 'refinement', text: trimmed }];
			refinementInput = '';
		} catch (err) {
			console.error('Explore refinement failed:', err);
			errorMessage =
				'Something went wrong refining recommendations. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	/** Reset the entire conversation. */
	function startNewSearch() {
		query = '';
		results = [];
		refinementInput = '';
		refinementCount = 0;
		originalQuery = '';
		hasSearched = false;
		errorMessage = '';
		conversationHistory = [];

		// Focus the main query input
		requestAnimationFrame(() => {
			queryInputEl?.focus();
		});
	}

	function handleQueryKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleQuery();
		}
	}

	function handleRefinementKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleRefinement();
		}
	}
</script>

<svelte:head>
	<title>Oracle</title>
</svelte:head>

{#if !tauriMode}
	<div class="desktop-only">
		<div class="desktop-only-icon">
			<svg
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
		</div>
		<h2>Natural-language exploration is available in the BlackTape desktop app</h2>
		<p>
			Explore music with free-text queries powered by local AI. Type what you're
			looking for and get curated recommendations.
		</p>
	</div>
{:else if !aiReady}
	<div class="desktop-only">
		<div class="desktop-only-icon">
			<svg
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z" />
				<rect x="3" y="8" width="18" height="14" rx="2" />
				<circle cx="12" cy="16" r="2" />
			</svg>
		</div>
		<h2>Enable AI features in Settings to explore music with natural language</h2>
		<p>
			Once AI is enabled, you can search for music using natural descriptions
			like "something like Boards of Canada but darker."
		</p>
		<a href="/settings" class="settings-link">Open Settings</a>
	</div>
{:else}
	<div class="explore-page">
		<div class="oracle-hero">
			<img src={oracleFigure} alt="" class="oracle-figure" aria-hidden="true" />
		</div>
		<div class="discover-mode-desc">
			<h2>Oracle</h2>
			<p>AI-powered open-ended discovery. Describe what you're looking for in plain language — the AI finds artists that match your vibe.</p>
		</div>
		<div class="page-header">
			<h1>Oracle</h1>
			{#if !tasteProfile.isLoaded}
				<!-- Skeleton: profile is loading — show placeholder for hint area -->
				<div class="taste-hint-skeleton">
					<div class="skeleton-line" style="width: 55%;"></div>
				</div>
			{:else if topTasteTags.length > 0}
				<!-- Normal state: taste data available -->
				<p class="taste-hint">
					Your taste leans toward {topTasteTags.join(', ')}
				</p>
			{:else}
				<!-- Empty taste state: loaded but no data -->
				<p class="taste-empty">
					<a href="/">Search for artists</a> and save favorites to get personalized exploration.
				</p>
			{/if}
		</div>

		<div class="query-section">
			<input
				bind:this={queryInputEl}
				bind:value={query}
				type="text"
				class="query-input"
				placeholder="Find me something like Boards of Canada but darker..."
				onkeydown={handleQueryKeydown}
				disabled={isLoading}
			/>
		</div>

		{#if conversationHistory.length > 0}
			<div class="conversation-history">
				{#each conversationHistory as entry}
					<div class="history-entry">
						<span class="history-label">{entry.role === 'user' ? 'Asked' : 'Refined'}</span>
						<span class="history-text">{entry.text}</span>
					</div>
				{/each}
			</div>
		{/if}

		{#if errorMessage}
			<p class="error-message">{errorMessage}</p>
		{/if}

		{#if isLoading}
			<div class="skeleton-list">
				<div class="skeleton-result">
					<div class="skeleton-number"></div>
					<div class="skeleton-content">
						<div class="skeleton-line name"></div>
						<div class="skeleton-line desc"></div>
					</div>
				</div>
				<div class="skeleton-result">
					<div class="skeleton-number"></div>
					<div class="skeleton-content">
						<div class="skeleton-line name"></div>
						<div class="skeleton-line desc"></div>
					</div>
				</div>
				<div class="skeleton-result">
					<div class="skeleton-number"></div>
					<div class="skeleton-content">
						<div class="skeleton-line name"></div>
						<div class="skeleton-line desc"></div>
					</div>
				</div>
				<div class="skeleton-result">
					<div class="skeleton-number"></div>
					<div class="skeleton-content">
						<div class="skeleton-line name"></div>
						<div class="skeleton-line desc long"></div>
					</div>
				</div>
			</div>
		{:else if results.length > 0}
			<div class="results-list">
				{#each results as result (result.number)}
					<ExploreResult
						number={result.number}
						artistName={result.artistName}
						description={result.description}
						slug={result.slug}
					/>
				{/each}
			</div>

			<div class="refinement-section">
				{#if refinementCount < MAX_REFINEMENTS}
					<input
						bind:value={refinementInput}
						type="text"
						class="refinement-input"
						placeholder="Refine — try 'darker', 'more electronic', 'from the 90s'..."
						onkeydown={handleRefinementKeydown}
						disabled={isLoading}
					/>
					{#if refinementCount > 0}
						<span class="refinement-counter">
							{refinementCount} of {MAX_REFINEMENTS} refinements
						</span>
					{/if}
				{:else}
					<div class="max-refinements">
						<p class="max-message">
							Reached the refinement limit for this conversation.
						</p>
						<button
							class="new-search-btn"
							onclick={startNewSearch}
						>
							Start a new search
						</button>
					</div>
				{/if}
			</div>
		{:else if hasSearched}
			<p class="no-results">
				No recommendations could be generated. Try a different query.
			</p>
		{/if}
	</div>
{/if}

<style>
	/* Desktop-only / AI-not-ready fallback */
	.desktop-only {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		text-align: center;
		padding:  20px;
		color: var(--t-2);
	}

	.desktop-only-icon {
		color: var(--t-3);
		margin-bottom: var(--space-lg);
	}

	.desktop-only h2 {
		font-size: 1.2rem;
		font-weight: 500;
		color: var(--t-1);
		margin: 0 0 var(--space-sm);
	}

	.desktop-only p {
		font-size: 0.85rem;
		margin: 0;
	}

	.settings-link {
		display: inline-block;
		margin-top: var(--space-lg);
		padding: 8px 20px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: 0;
		color: var(--t-1);
		font-size: 0.85rem;
		font-weight: 500;
		text-decoration: none;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.settings-link:hover {
		background: var(--bg-3);
		border-color: var(--b-3);
		text-decoration: none;
	}

	/* Description header */
	.discover-mode-desc {
		padding: 10px 16px 8px;
		border-bottom: 1px solid var(--b-0);
		background: var(--bg-1);
		margin: -20px -20px 20px;
	}
		.discover-mode-desc h2 {
		font-size: 14px;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 3px;
	}
	.discover-mode-desc p {
		font-size: 12px;
		color: var(--t-2);
		margin: 0;
		line-height: 1.5;
	}

	/* Oracle figure hero — full-width landscape banner */
	.oracle-hero {
		margin: -20px -20px 0;
		pointer-events: none;
		line-height: 0;
		height: 380px;
		overflow: hidden;
	}

	.oracle-figure {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		object-position: top;
		opacity: 0.5;
	}

	/* Explore page layout */
	.explore-page {
		padding: 0 20px 20px;
	}

	.page-header {
		margin-bottom: var(--space-xl);
	}

	.page-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0;
	}

	.taste-hint {
		font-size: 0.8rem;
		color: var(--t-3);
		margin: var(--space-xs) 0 0;
		font-style: italic;
	}

	.taste-hint-skeleton {
		margin-top: var(--space-xs, 0.4rem);
	}

	.taste-empty {
		font-size: 0.85rem;
		color: var(--t-3);
		margin-top: var(--space-xs, 0.4rem);
	}

	.taste-empty a {
		color: var(--acc);
	}

	/* Query input */
	.query-section {
		margin-bottom: var(--space-xl);
	}

	.query-input {
		width: 100%;
		padding: 14px 18px;
		font-size: 1.2rem;
		font-family: var(--font-sans);
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 0;
		color: var(--t-1);
		outline: none;
		transition: border-color 0.15s;
	}

	.query-input:focus {
		border-color: var(--b-3);
	}

	.query-input::placeholder {
		color: var(--t-3);
	}

	.query-input:disabled {
		opacity: 0.6;
	}

	/* Conversation history */
	.conversation-history {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-md);
	}

	.history-entry {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 0;
		font-size: 0.75rem;
	}

	.history-label {
		color: var(--t-3);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.65rem;
	}

	.history-text {
		color: var(--t-2);
	}

	/* Error message */
	.error-message {
		color: #ef4444;
		font-size: 0.85rem;
		margin: 0 0 var(--space-md);
	}

	/* Loading skeleton */
	.skeleton-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.skeleton-result {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-md) 0;
		border-bottom: 1px solid var(--b-1);
	}

	.skeleton-result:last-child {
		border-bottom: none;
	}

	.skeleton-number {
		width: 2rem;
		height: 1.4rem;
		background: var(--bg-3);
		border-radius: 0;
		flex-shrink: 0;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.skeleton-line {
		height: 1rem;
		background: var(--bg-3);
		border-radius: 0;
		animation: skeleton-pulse 1.5s ease-in-out infinite;
	}

	.skeleton-line.name {
		width: 35%;
		height: 1.1rem;
	}

	.skeleton-line.desc {
		width: 70%;
	}

	.skeleton-line.long {
		width: 85%;
	}

	@keyframes skeleton-pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.8;
		}
	}

	/* Results list */
	.results-list {
		margin-bottom: var(--space-lg);
	}

	/* Refinement section */
	.refinement-section {
		padding-top: var(--space-md);
		animation: fade-in 0.3s ease;
	}

	.refinement-input {
		width: 100%;
		padding: 10px 14px;
		font-size: 0.95rem;
		font-family: var(--font-sans);
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		border-radius: 0;
		color: var(--t-1);
		outline: none;
		transition: border-color 0.15s;
	}

	.refinement-input:focus {
		border-color: var(--b-3);
	}

	.refinement-input::placeholder {
		color: var(--t-3);
	}

	.refinement-input:disabled {
		opacity: 0.6;
	}

	.refinement-counter {
		display: block;
		font-size: 0.75rem;
		color: var(--t-3);
		margin-top: var(--space-xs);
	}

	/* Max refinements reached */
	.max-refinements {
		text-align: center;
		padding: var(--space-md) 0;
	}

	.max-message {
		font-size: 0.85rem;
		color: var(--t-3);
		margin: 0 0 var(--space-md);
	}

	.new-search-btn {
		padding: 8px 20px;
		background: var(--bg-3);
		border: 1px solid var(--b-2);
		border-radius: 0;
		color: var(--t-1);
		font-size: 0.85rem;
		font-weight: 500;
		font-family: var(--font-sans);
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.new-search-btn:hover {
		background: var(--bg-3);
		border-color: var(--b-3);
	}

	/* No results */
	.no-results {
		font-size: 0.85rem;
		color: var(--t-3);
		text-align: center;
		margin: var(--space-xl) 0;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
