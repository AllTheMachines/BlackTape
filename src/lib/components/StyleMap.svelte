<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		forceCollide,
		type SimulationNodeDatum,
		type SimulationLinkDatum
	} from 'd3-force';
	import type { StyleMapNode, StyleMapEdge } from '$lib/db/queries';

	interface SimNode extends SimulationNodeDatum {
		id: string;
		artistCount: number;
	}

	interface LayoutNode extends SimNode {
		x: number;
		y: number;
	}

	let { nodes: rawNodes, edges: rawEdges }: {
		nodes: StyleMapNode[];
		edges: StyleMapEdge[];
	} = $props();

	let width = $state(800);
	let height = $state(600);
	let layoutNodes = $state<LayoutNode[]>([]);
	let layoutEdges = $state<Array<{ x1: number; y1: number; x2: number; y2: number; strength: number }>>([]);
	let container: HTMLDivElement;
	let hoveredTag = $state<string | null>(null);

	// Compute node radius from artist_count (log scale to prevent huge dominant nodes)
	function nodeRadius(artistCount: number): number {
		return Math.max(6, Math.min(30, Math.log10(artistCount) * 8));
	}

	onMount(() => {
		// Respond to container size
		width = container.clientWidth || 800;
		height = Math.max(500, window.innerHeight - 200);

		const simNodes: SimNode[] = rawNodes.map(n => ({ id: n.tag, artistCount: n.artist_count }));
		const maxShared = Math.max(...rawEdges.map(e => e.shared_artists), 1);
		const simLinks = rawEdges.map(e => ({
			source: e.tag_a,
			target: e.tag_b,
			strength: e.shared_artists / maxShared
		}));

		const simulation = forceSimulation(simNodes)
			.force('link', forceLink(simLinks)
				.id((d: any) => d.id)
				.strength((d: any) => d.strength * 0.4))
			.force('charge', forceManyBody().strength(-120))
			.force('center', forceCenter(width / 2, height / 2))
			.force('collide', forceCollide().radius((d: any) => nodeRadius(d.artistCount) + 8));

		// Run to static completion — no continuous rerenders
		simulation.tick(500);
		const settled = simulation.nodes() as LayoutNode[];
		simulation.stop();

		// Compute edge positions from settled node positions
		const nodeMap = new Map(settled.map(n => [n.id, n]));
		layoutEdges = rawEdges
			.map(e => {
				const src = nodeMap.get(e.tag_a);
				const tgt = nodeMap.get(e.tag_b);
				if (!src || !tgt) return null;
				return {
					x1: src.x,
					y1: src.y,
					x2: tgt.x,
					y2: tgt.y,
					strength: e.shared_artists / maxShared
				};
			})
			.filter(Boolean) as typeof layoutEdges;

		layoutNodes = settled;
	});

	function handleNodeClick(tag: string) {
		goto(`/discover?tags=${encodeURIComponent(tag)}`);
	}
</script>

<div class="style-map-container" bind:this={container}
     data-ready={layoutNodes.length > 0 ? 'true' : undefined}>
	{#if layoutNodes.length === 0}
		<div class="loading">Building style map...</div>
	{:else}
		<svg {width} {height} class="style-map-svg">
			<!-- Edges first (rendered behind nodes) -->
			<g class="edges">
				{#each layoutEdges as edge}
					<line
						x1={edge.x1} y1={edge.y1}
						x2={edge.x2} y2={edge.y2}
						stroke="var(--border-default)"
						stroke-width={Math.max(0.5, edge.strength * 3)}
						stroke-opacity={0.3 + edge.strength * 0.4}
					/>
				{/each}
			</g>

			<!-- Nodes -->
			<g class="nodes">
				{#each layoutNodes as node}
					{@const r = nodeRadius(node.artistCount)}
					{@const isHovered = hoveredTag === node.id}
					<g
						class="node"
						transform="translate({node.x},{node.y})"
						role="button"
						tabindex="0"
						aria-label={node.id}
						onclick={() => handleNodeClick(node.id)}
						onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node.id)}
						onmouseenter={() => hoveredTag = node.id}
						onmouseleave={() => hoveredTag = null}
					>
						<circle
							{r}
							fill={isHovered ? 'var(--text-accent)' : 'var(--bg-elevated)'}
							stroke={isHovered ? 'var(--text-accent)' : 'var(--border-default)'}
							stroke-width="1.5"
							style="cursor: pointer; transition: fill 0.15s, stroke 0.15s;"
						/>
						{#if r > 10 || isHovered}
							<text
								text-anchor="middle"
								dy="0.35em"
								font-size={Math.max(8, Math.min(12, r * 0.8))}
								fill={isHovered ? 'var(--bg-base)' : 'var(--text-secondary)'}
								pointer-events="none"
								style="transition: fill 0.15s; user-select: none;"
							>
								{node.id}
							</text>
						{/if}
					</g>
				{/each}
			</g>
		</svg>
	{/if}
</div>

<style>
	.style-map-container {
		width: 100%;
		position: relative;
		background: var(--bg-base);
		border-radius: 8px;
		overflow: hidden;
	}

	.style-map-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 400px;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.node {
		outline: none;
	}
</style>
