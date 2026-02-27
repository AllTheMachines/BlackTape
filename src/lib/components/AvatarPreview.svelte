<script lang="ts">
	import { avatarState } from '$lib/identity/avatar.svelte';

	let { size = 128 } = $props();
</script>

<div class="avatar-preview" style="width:{size}px; height:{size}px;">
	{#if avatarState.mode === 'edited' && avatarState.editedPixels.length === 256}
		<div class="pixel-display">
			{#each avatarState.editedPixels as color}
				<div class="pixel-cell" style="background:{color}"></div>
			{/each}
		</div>
	{:else if avatarState.svgString}
		{@html avatarState.svgString}
	{:else}
		<div class="avatar-placeholder">?</div>
	{/if}
</div>

<style>
	.avatar-preview {
		border-radius: 0;
		overflow: hidden;
		background: var(--bg-secondary);
		flex-shrink: 0;
	}
	.pixel-display {
		display: grid;
		grid-template-columns: repeat(16, 1fr);
		width: 100%;
		height: 100%;
	}
	.pixel-cell {
		width: 100%;
		aspect-ratio: 1;
	}
	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		font-size: 2rem;
	}
</style>
