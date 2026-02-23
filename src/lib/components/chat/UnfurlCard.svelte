<script lang="ts">
	import type { UnfurlCard as UnfurlCardData } from '$lib/comms/unfurl.js';

	let { card }: { card: UnfurlCardData } = $props();
</script>

<a href={card.url} class="unfurl-card" target="_self">
	{#if card.image}
		<img src={card.image} alt="" class="unfurl-img" loading="lazy" />
	{/if}
	<div class="unfurl-text">
		<span class="unfurl-title">{card.title}</span>
		{#if card.description}
			<span class="unfurl-desc">{card.description}</span>
		{/if}
	</div>
	<span class="unfurl-badge">mercury</span>
</a>

<style>
	.unfurl-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid var(--border-default);
		border-radius: 8px;
		background: var(--bg-elevated);
		text-decoration: none;
		color: inherit;
		margin: 4px 0;
	}
	.unfurl-card:hover {
		border-color: var(--link-color);
	}
	.unfurl-img {
		width: 44px;
		height: 44px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}
	.unfurl-text {
		flex: 1;
		overflow: hidden;
	}
	.unfurl-title {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.unfurl-desc {
		display: block;
		font-size: 0.7rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.unfurl-badge {
		font-size: 0.6rem;
		color: var(--link-color);
		white-space: nowrap;
	}
</style>
