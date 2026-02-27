<script lang="ts">
	import { avatarState, saveAvatarMode, GRID_SIZE, EMPTY_PIXELS } from '$lib/identity/avatar.svelte';

	const { onSave }: { onSave?: (pixels: string[]) => void } = $props();

	const GRID = GRID_SIZE; // 16
	let pixels = $state(
		avatarState.editedPixels.length === GRID * GRID
			? [...avatarState.editedPixels]
			: [...EMPTY_PIXELS]
	);
	let selectedColor = $state('#e0e0e0');
	let tool: 'pencil' | 'eraser' = $state('pencil');
	let isPainting = $state(false);

	function paint(index: number) {
		pixels[index] = tool === 'pencil' ? selectedColor : 'transparent';
	}

	function handleMousedown(index: number) {
		isPainting = true;
		paint(index);
	}

	function handleMouseenter(index: number, _e: MouseEvent) {
		if (isPainting) paint(index);
	}

	async function handleSave() {
		await saveAvatarMode('edited', [...pixels]);
		onSave?.([...pixels]);
	}

	function handleClear() {
		pixels = [...EMPTY_PIXELS];
	}
</script>

<svelte:window onmouseup={() => (isPainting = false)} />

<div class="avatar-editor">
	<div class="editor-toolbar">
		<label>
			Color
			<input type="color" bind:value={selectedColor} />
		</label>
		<button
			class="tool-btn"
			class:active={tool === 'pencil'}
			onclick={() => (tool = 'pencil')}
		>Pencil</button>
		<button
			class="tool-btn"
			class:active={tool === 'eraser'}
			onclick={() => (tool = 'eraser')}
		>Eraser</button>
		<button class="tool-btn" onclick={handleClear}>Clear</button>
	</div>

	<div class="pixel-grid" role="grid" aria-label="Pixel art editor">
		{#each pixels as color, i}
			<div
				class="pixel"
				style="background:{color === 'transparent' ? 'var(--bg-tertiary)' : color}"
				role="gridcell"
				tabindex="-1"
				onmousedown={() => handleMousedown(i)}
				onmouseenter={(e) => handleMouseenter(i, e)}
				aria-label="Pixel {i}"
			></div>
		{/each}
	</div>

	<div class="editor-actions">
		<button class="btn-primary" onclick={handleSave}>Save Avatar</button>
	</div>
</div>

<style>
	.avatar-editor {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
	.editor-toolbar {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}
	.tool-btn {
		padding: 4px 8px;
		border: 1px solid var(--border);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
		border-radius: 0;
		font-size: 0.75rem;
	}
	.tool-btn.active {
		background: var(--accent);
		border-color: var(--accent);
	}
	.pixel-grid {
		display: grid;
		grid-template-columns: repeat(16, 1fr);
		width: 256px;
		height: 256px;
		border: 1px solid var(--border);
		cursor: crosshair;
		user-select: none;
	}
	.pixel {
		width: 100%;
		height: 100%;
		border: 0.5px solid rgba(128, 128, 128, 0.1);
	}
	.editor-actions {
		display: flex;
		gap: var(--spacing-sm);
	}
	.btn-primary {
		padding: 6px 16px;
		background: var(--accent);
		color: #fff;
		border: none;
		border-radius: 0;
		cursor: pointer;
		font-size: 0.85rem;
	}
</style>
