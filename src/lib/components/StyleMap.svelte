<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { startProgress, completeProgress } from '$lib/nav-progress.svelte';
	import { isTauri } from '$lib/platform';
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

	let { nodes: rawNodes, edges: rawEdges, initialTag = null }: {
		nodes: StyleMapNode[];
		edges: StyleMapEdge[];
		initialTag?: string | null;
	} = $props();

	let width = $state(800);
	let height = $state(600);
	let layoutNodes = $state<LayoutNode[]>([]);
	let layoutEdges = $state<Array<{ x1: number; y1: number; x2: number; y2: number; strength: number }>>([]);
	let container: HTMLDivElement;
	let hoveredTag = $state<string | null>(null);

	// Estimate label rectangle width from tag string length
	const FONT_SIZE = 11;
	const CHAR_WIDTH = 6.5;
	const PAD_X = 10;
	const PAD_Y = 5;
	const RECT_H = FONT_SIZE + PAD_Y * 2;

	function labelWidth(tag: string): number {
		return Math.max(40, tag.length * CHAR_WIDTH + PAD_X * 2);
	}

	onMount(async () => {
		width = container.clientWidth || 800;
		height = Math.max(500, window.innerHeight - 200);
		if (isTauri()) startProgress();
		await runSimulation();
		if (isTauri()) completeProgress();
	});

	async function runSimulation() {
		if (rawNodes.length === 0) return;

		const maxShared = Math.max(...rawEdges.map(e => e.shared_artists), 1);
		const simNodes: SimNode[] = rawNodes.map(n => ({ id: n.tag, artistCount: n.artist_count }));
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
			.force('collide', forceCollide().radius((d: any) => labelWidth(d.id) / 2 + 6));

		// Chunked async ticking — keeps UI thread free between chunks
		const CHUNK = 30;
		const TOTAL = 300;
		let done = 0;
		await new Promise<void>(resolve => {
			function step() {
				simulation.tick(Math.min(CHUNK, TOTAL - done));
				done += CHUNK;
				if (done < TOTAL) requestAnimationFrame(step);
				else resolve();
			}
			requestAnimationFrame(step);
		});

		const settled = simulation.nodes() as LayoutNode[];
		simulation.stop();

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
		if (initialTag) hoveredTag = initialTag;
	}

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
						stroke="var(--b-1)"
						stroke-width={Math.max(0.5, edge.strength * 3)}
						stroke-opacity={0.3 + edge.strength * 0.4}
					/>
				{/each}
			</g>

			<!-- Nodes -->
			<g class="nodes">
				{#each layoutNodes as node}
					{@const w = labelWidth(node.id)}
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
						<rect
							x={-w / 2}
							y={-RECT_H / 2}
							width={w}
							height={RECT_H}
							rx="2"
							fill={isHovered ? 'var(--acc)' : 'var(--bg-3)'}
							stroke={isHovered ? 'var(--acc)' : 'var(--b-1)'}
							stroke-width="1"
							style="cursor: pointer; transition: fill 0.15s, stroke 0.15s;"
						/>
						<text
							text-anchor="middle"
							dy="0.35em"
							font-size={FONT_SIZE}
							fill={isHovered ? 'var(--bg-1)' : 'var(--t-2)'}
							pointer-events="none"
							style="transition: fill 0.15s; user-select: none;"
						>
							{node.id}
						</text>
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
		border-radius: 0;
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
