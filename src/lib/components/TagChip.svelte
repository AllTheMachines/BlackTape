<script lang="ts">
	let {
		tag,
		count,
		clickable = true,
		active = false
	}: {
		tag: string;
		count?: number;
		clickable?: boolean;
		active?: boolean;
	} = $props();
</script>

{#if clickable}
	<a href="/search?q={encodeURIComponent(tag)}&mode=tag" class="tag-chip" class:active={active}>
		<span class="tag-name">{tag}</span>
		{#if count !== undefined}
			<span class="tag-count">{count.toLocaleString()}</span>
		{/if}
	</a>
{:else}
	<span class="tag-chip" class:active={active}>
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
		gap: 3px;
		height: 22px;
		padding: 0 7px;
		background: var(--bg-4);
		border: 1px solid var(--b-2);
		border-radius: var(--r);   /* 2px — square, not pill */
		font-size: 10px;
		color: var(--t-3);
		cursor: pointer;
		white-space: nowrap;
		text-decoration: none;
		transition: border-color 0.1s, color 0.1s;
	}

	a.tag-chip:hover {
		border-color: var(--acc);
		color: var(--t-2);
		text-decoration: none;
	}

	/* Active state — used when parent passes active prop */
	.tag-chip.active {
		background: var(--acc-bg);
		border-color: var(--b-acc);
		color: var(--acc);
	}

	.tag-count {
		font-size: 9px;
		color: var(--t-3);
		opacity: 0.7;
	}
</style>
