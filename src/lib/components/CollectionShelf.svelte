<script lang="ts">
	import { onMount } from 'svelte';
	import { getCollectionItems, removeFromCollection } from '$lib/taste/collections.svelte';
	import type { CollectionItem } from '$lib/taste/collections.svelte';

	const {
		collectionId,
		collectionName
	}: {
		collectionId: string;
		collectionName: string;
	} = $props();

	let items = $state<CollectionItem[]>([]);
	let isLoading = $state(true);

	onMount(async () => {
		items = await getCollectionItems(collectionId);
		isLoading = false;
	});

	async function handleRemove(item: CollectionItem) {
		await removeFromCollection(collectionId, item.item_type as 'artist' | 'release', item.item_mbid);
		items = items.filter((i) => i.id !== item.id);
	}
</script>

<div class="collection-shelf">
	<h2 class="shelf-title">{collectionName}</h2>

	{#if isLoading}
		<p class="shelf-empty">Loading...</p>
	{:else if items.length === 0}
		<p class="shelf-empty">
			No items yet. Use the Save button on artist or release pages to add to this shelf.
		</p>
	{:else}
		<div class="shelf-grid">
			{#each items as item (item.id)}
				<div class="shelf-card">
					<span class="item-type">{item.item_type}</span>
					{#if item.item_slug}
						<a class="item-name" href="/{item.item_type === 'artist' ? 'artist' : 'release'}/{item.item_slug}"
							>{item.item_name}</a
						>
					{:else}
						<span class="item-name">{item.item_name}</span>
					{/if}
					<button
						class="remove-btn"
						onclick={() => handleRemove(item)}
						aria-label="Remove {item.item_name} from collection"
					>×</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.collection-shelf {
		margin-bottom: var(--spacing-lg);
	}
	.shelf-title {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: var(--spacing-sm);
		color: var(--text-primary);
	}
	.shelf-empty {
		color: var(--text-muted);
		font-size: 0.875rem;
	}
	.shelf-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: var(--spacing-sm);
	}
	.shelf-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		border-radius: 0;
		padding: var(--spacing-sm);
		display: flex;
		flex-direction: column;
		gap: 4px;
		position: relative;
	}
	.item-type {
		font-size: 0.7rem;
		text-transform: uppercase;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}
	.item-name {
		font-size: 0.85rem;
		color: var(--text-primary);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.item-name:hover {
		color: var(--accent);
	}
	.remove-btn {
		position: absolute;
		top: 4px;
		right: 4px;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		padding: 0 2px;
	}
	.remove-btn:hover {
		color: var(--text-primary);
	}
</style>
