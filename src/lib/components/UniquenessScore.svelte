<script lang="ts">
	/**
	 * Displays an artist's uniqueness score as a categorical label.
	 * Score is the raw value from getArtistUniquenessScore() (0.0001–0.01+ range).
	 * Null score means no tags — badge is hidden.
	 */
	let { score, tagCount = 0 }: { score: number | null; tagCount?: number } = $props();

	type ScoreTier = {
		label: string;
		className: string;
		description: string;
	};

	function getScoreTier(s: number, tags: number): ScoreTier {
		// Score thresholds derived from tag rarity distribution:
		// Very niche: top ~5% (score > 0.005) — ultra-rare tags, very few total tags
		// Niche: top ~20% (score 0.001–0.005) — uncommon tags
		// Eclectic: middle (score 0.0003–0.001) — mix of common and uncommon
		// Mainstream: bottom ~30% (score < 0.0003) — many common tags
		if (s >= 0.005) return { label: 'Very Niche', className: 'very-niche', description: 'Extremely rare tag combination' };
		if (s >= 0.001) return { label: 'Niche', className: 'niche', description: 'Uncommon genre profile' };
		if (s >= 0.0003) return { label: 'Eclectic', className: 'eclectic', description: 'Broad genre profile' };
		return { label: 'Mainstream', className: 'mainstream', description: 'Widely tagged genres' };
	}

	let tier = $derived(score !== null && score > 0 ? getScoreTier(score, tagCount) : null);
</script>

{#if tier}
	<span class="uniqueness-badge {tier.className}" title={tier.description}>
		{tier.label}
	</span>
{/if}

<style>
	.uniqueness-badge {
		display: inline-block;
		font-size: 0.65rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 3px;
		border: 1px solid currentColor;
		opacity: 0.9;
	}

	.very-niche {
		color: var(--text-accent);
		border-color: var(--text-accent);
		background: color-mix(in srgb, var(--text-accent) 10%, transparent);
	}

	.niche {
		color: #7dd3a8;
		border-color: #7dd3a8;
		background: color-mix(in srgb, #7dd3a8 10%, transparent);
	}

	.eclectic {
		color: var(--text-secondary);
		border-color: var(--border-default);
		background: transparent;
	}

	.mainstream {
		color: var(--text-muted);
		border-color: var(--border-subtle);
		background: transparent;
	}
</style>
