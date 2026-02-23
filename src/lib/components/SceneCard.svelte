<script lang="ts">
	import type { DetectedScene } from '$lib/scenes';

	let {
		scene,
		href
	}: {
		scene: DetectedScene;
		href: string;
	} = $props();

	const topTags = $derived(scene.tags.slice(0, 3).join(', '));
</script>

<a {href} class="scene-card" class:emerging={scene.isEmerging}>
	<div class="card-header">
		<h3 class="scene-name">{scene.name}</h3>
		{#if scene.isEmerging}
			<span class="emerging-badge">Emerging</span>
		{/if}
	</div>

	{#if topTags}
		<p class="scene-tags">{topTags}</p>
	{/if}

	<div class="card-footer">
		{#if scene.listenerCount > 0}
			<span class="listener-badge">{scene.listenerCount} listener{scene.listenerCount === 1 ? '' : 's'}</span>
		{:else}
			<span class="listener-badge new-badge">new</span>
		{/if}
	</div>
</a>

<style>
	.scene-card {
		display: block;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--card-radius);
		padding: var(--space-md);
		text-decoration: none;
		color: inherit;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.scene-card:hover {
		background: var(--bg-hover);
		border-color: var(--border-default);
	}

	.scene-card.emerging {
		border-color: var(--accent, #60a5fa);
		border-opacity: 0.4;
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.scene-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-accent);
		margin: 0;
		flex: 1;
		line-height: 1.3;
	}

	.emerging-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--accent, #60a5fa);
		border: 1px solid var(--accent, #60a5fa);
		border-radius: 999px;
		padding: 1px 6px;
		white-space: nowrap;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.scene-tags {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0 0 var(--space-sm);
		line-height: 1.4;
	}

	.card-footer {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.listener-badge {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.new-badge {
		color: var(--text-muted);
		font-style: italic;
	}
</style>
