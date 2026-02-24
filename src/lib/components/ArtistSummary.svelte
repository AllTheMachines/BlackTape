<script lang="ts">
	/**
	 * ArtistSummary — AI-generated artist summary with cache, lifecycle, and all UI states.
	 *
	 * States:
	 *   hidden       — no cache and auto-generate off (section not rendered)
	 *   generating   — AI call in flight (spinner + "Generating..." text)
	 *   cached       — cached text with [AI] badge, timestamp, and regenerate button
	 *   stale-refresh — shows old text immediately, refreshes in background (intentional fire-and-forget)
	 *   silent-fail  — on API error, reverts to last cached text (or stays hidden if no cache)
	 *
	 * Props:
	 *   artistMbid  — cache key in taste.db
	 *   artistName  — passed to the prompt
	 *   artistTags  — comma-separated tags string from data.artist.tags
	 *   releases    — array from data.releases (title, year, type)
	 *
	 * Critical constraints:
	 *   - invoke is lazily imported — never at module level (project convention)
	 *   - generateSummary is NOT awaited in the background refresh path (fire-and-forget)
	 *   - All AI failures are silent — no error UI ever appears
	 *   - Only artistSummaryFromReleases is used — NOT PROMPTS.artistSummary
	 */
	import { onMount } from 'svelte';
	import { getAiProvider } from '$lib/ai/engine';
	import { aiState } from '$lib/ai/state.svelte';
	import { artistSummaryFromReleases } from '$lib/ai/prompts';

	let {
		artistMbid,
		artistName,
		artistTags,
		releases
	}: {
		artistMbid: string;
		artistName: string;
		artistTags: string;
		releases: Array<{ title: string; year: number | null; type: string }>;
	} = $props();

	// State machine variables
	let summaryText = $state<string | null>(null);
	let generatedAt = $state<number | null>(null);
	let isGenerating = $state(false);

	// 30-day TTL in seconds
	const SUMMARY_TTL_SECONDS = 30 * 24 * 60 * 60;

	/** Returns true if the cached summary is older than 30 days. */
	function isSummaryStale(ts: number): boolean {
		const nowSeconds = Math.floor(Date.now() / 1000);
		return nowSeconds - ts > SUMMARY_TTL_SECONDS;
	}

	/** Returns a human-readable relative timestamp. */
	function formatRelativeTime(ts: number): string {
		const nowSeconds = Math.floor(Date.now() / 1000);
		const diffSeconds = nowSeconds - ts;
		const diffDays = Math.floor(diffSeconds / (60 * 60 * 24));

		if (diffDays === 0) return 'Generated today';
		if (diffDays === 1) return 'Generated yesterday';
		return `Generated ${diffDays} days ago`;
	}

	/**
	 * Generate a fresh AI summary, save it to taste.db, and update local state.
	 * Silent failure — errors are swallowed, UI reverts to last known state.
	 */
	async function generateSummary(): Promise<void> {
		const provider = getAiProvider();
		if (!provider) return;

		isGenerating = true;

		try {
			const prompt = artistSummaryFromReleases(artistName, releases, artistTags);
			const result = await provider.complete(prompt.user, {
				systemPrompt: prompt.system,
				temperature: 0.3,
				maxTokens: 200
			});

			if (result && result.trim()) {
				const { invoke } = await import('@tauri-apps/api/core');
				await invoke('save_artist_summary', { artistMbid, summary: result.trim() });
				summaryText = result.trim();
				generatedAt = Math.floor(Date.now() / 1000);
			}
		} catch {
			// Silent fail — spec requires no error UI
		} finally {
			isGenerating = false;
		}
	}

	onMount(() => {
		(async () => {
			try {
				const { invoke } = await import('@tauri-apps/api/core');
				const cached = await invoke<{ summary: string; generated_at: number } | null>(
					'get_artist_summary',
					{ artistMbid }
				);

				if (cached) {
					summaryText = cached.summary;
					generatedAt = cached.generated_at;
					if (isSummaryStale(cached.generated_at) && aiState.autoGenerateOnVisit) {
						generateSummary(); // intentionally not awaited — background refresh
					}
				} else if (aiState.autoGenerateOnVisit && getAiProvider()) {
					generateSummary(); // no cache, auto-generate if opted in
				}
				// else: no cache, auto-generate off — section stays hidden
			} catch {
				// Silent
			}
		})();
	});
</script>

{#if summaryText || isGenerating}
	<section class="ai-summary" data-testid="ai-summary">
		<span class="ai-badge">AI</span>

		{#if isGenerating}
			<p class="ai-generating">
				<span class="ai-spinner" aria-hidden="true">⟳</span>
				Generating...
			</p>
		{:else}
			<p class="ai-summary-text">{summaryText}</p>

			<div class="ai-summary-footer">
				{#if generatedAt !== null}
					<span class="ai-timestamp">{formatRelativeTime(generatedAt)}</span>
				{/if}
				<button
					class="ai-regenerate"
					onclick={generateSummary}
					disabled={isGenerating}
					aria-label="Regenerate AI summary"
				>↺</button>
				<span class="ai-attribution">AI summary based on MusicBrainz data</span>
			</div>
		{/if}
	</section>
{/if}

<style>
	.ai-summary {
		margin: 1rem 0 1.5rem;
		padding: 0.75rem 1rem;
		border-left: 3px solid var(--color-accent, #888);
		background: var(--color-surface-alt, rgba(255, 255, 255, 0.04));
		border-radius: 0 4px 4px 0;
	}

	.ai-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		padding: 0.1em 0.4em;
		border: 1px solid currentColor;
		border-radius: 3px;
		opacity: 0.6;
		margin-bottom: 0.4rem;
		text-transform: uppercase;
	}

	.ai-summary-text {
		margin: 0 0 0.5rem;
		line-height: 1.55;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.ai-generating {
		margin: 0;
		font-size: 0.9rem;
		opacity: 0.6;
		font-style: italic;
	}

	.ai-spinner {
		display: inline-block;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.ai-summary-footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.ai-timestamp {
		font-size: 0.75rem;
		opacity: 0.5;
	}

	.ai-attribution {
		font-size: 0.75rem;
		opacity: 0.45;
		flex: 1;
	}

	.ai-regenerate {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.1rem 0.25rem;
		font-size: 0.9rem;
		opacity: 0.5;
		line-height: 1;
		transition: opacity 0.15s;
	}

	.ai-regenerate:hover {
		opacity: 1;
	}

	.ai-regenerate:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}
</style>
