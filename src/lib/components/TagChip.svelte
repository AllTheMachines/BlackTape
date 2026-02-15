<script lang="ts">
	let {
		tag,
		count,
		clickable = true
	}: {
		tag: string;
		count?: number;
		clickable?: boolean;
	} = $props();
</script>

{#if clickable}
	<a href="/search?q={encodeURIComponent(tag)}&mode=tag" class="tag-chip">
		<span class="tag-name">{tag}</span>
		{#if count !== undefined}
			<span class="tag-count">{count.toLocaleString()}</span>
		{/if}
	</a>
{:else}
	<span class="tag-chip">
		<span class="tag-name">{tag}</span>
		{#if count !== undefined}
			<span class="tag-count">{count.toLocaleString()}</span>
		{/if}
	</span>
{/if}

<style>
	.tag-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 2px var(--space-sm);
		background: var(--tag-bg);
		color: var(--tag-text);
		border: 1px solid var(--tag-border);
		border-radius: 999px;
		font-size: 0.8rem;
		line-height: 1.4;
		text-decoration: none;
		transition:
			background 0.15s,
			border-color 0.15s;
		white-space: nowrap;
	}

	a.tag-chip:hover {
		background: #1f2d42;
		border-color: #3a4f6a;
		text-decoration: none;
	}

	.tag-count {
		color: var(--text-muted);
		font-size: 0.7rem;
	}
</style>
