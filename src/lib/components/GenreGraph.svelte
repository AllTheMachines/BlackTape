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
		type SimulationNodeDatum
	} from 'd3-force';
	import type { GenreNode, GenreEdge } from '$lib/db/queries';

	interface SimNode extends SimulationNodeDatum {
		id: number;
		slug: string;
		name: string;
		type: 'genre' | 'scene' | 'city';
	}

	interface LayoutNode extends SimNode {
		x: number;
		y: number;
	}

	let {
		nodes,
		edges,
		focusSlug = null,
		onNodeClick
	}: {
		nodes: GenreNode[];
		edges: GenreEdge[];
		focusSlug?: string | null;
		onNodeClick?: (node: GenreNode) => void;
	} = $props();

	let width = $state(800);
	let height = $state(600);
	let layoutNodes = $state<LayoutNode[]>([]);
	let layoutEdges = $state<
		Array<{ x1: number; y1: number; x2: number; y2: number; rel_type: string }>
	>([]);
	let container: HTMLDivElement;
	let hoveredId = $state<number | null>(null);

	const FONT_SIZE = 11;
	const CHAR_WIDTH = 6.5;
	const PAD_X = 10;
	const PAD_Y = 5;
	const RECT_H = FONT_SIZE + PAD_Y * 2;

	function labelWidth(name: string): number {
		return Math.max(50, name.length * CHAR_WIDTH + PAD_X * 2);
	}

	// Colors per node type
	function nodeColors(type: 'genre' | 'scene' | 'city', active: boolean) {
		if (type === 'genre') return {
			fill: active ? 'var(--acc)' : 'var(--bg-3)',
			stroke: active ? 'var(--acc)' : 'var(--b-2)',
			text: active ? 'var(--bg-1)' : 'var(--t-2)',
			dasharray: undefined as string | undefined
		};
		if (type === 'scene') return {
			fill: active ? 'var(--color-scene-hover, #f0a030)' : 'var(--color-scene, #c07820)',
			stroke: active ? 'var(--color-scene-hover, #f0a030)' : 'var(--color-scene-border, #a06010)',
			text: 'var(--bg-1)',
			dasharray: undefined as string | undefined
		};
		// city: transparent fill, dashed border
		return {
			fill: 'transparent',
			stroke: active ? 'var(--color-city-hover, #60c090)' : 'var(--color-city, #3a8060)',
			text: active ? 'var(--color-city-hover, #60c090)' : 'var(--color-city, #3a8060)',
			dasharray: '4 3' as string | undefined
		};
	}

	async function runSimulation() {
		if (!nodes || nodes.length === 0) return;

		const simNodes: SimNode[] = nodes.map((n) => ({
			id: n.id,
			slug: n.slug,
			name: n.name,
			type: n.type
		}));

		const simLinks = edges.map((e) => ({
			source: e.from_id,
			target: e.to_id,
			rel_type: e.rel_type,
			strength: e.rel_type === 'subgenre' ? 0.4 : 0.15
		}));

		const simulation = forceSimulation(simNodes)
			.force(
				'link',
				forceLink(simLinks)
					.id((d: any) => d.id)
					.strength((d: any) => d.strength)
			)
			.force('charge', forceManyBody().strength(-180))
			.force('center', forceCenter(width / 2, height / 2))
			.force(
				'collide',
				forceCollide().radius((d: any) => labelWidth(d.name) / 2 + 6)
			);

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

		const nodeMap = new Map(settled.map((n) => [n.id, n]));

		layoutEdges = edges
			.map((e) => {
				const src = nodeMap.get(e.from_id);
				const tgt = nodeMap.get(e.to_id);
				if (!src || !tgt) return null;
				return {
					x1: src.x,
					y1: src.y,
					x2: tgt.x,
					y2: tgt.y,
					rel_type: e.rel_type
				};
			})
			.filter(Boolean) as typeof layoutEdges;

		layoutNodes = settled;
	}

	onMount(async () => {
		width = container.clientWidth || 800;
		height = Math.max(500, window.innerHeight - 200);
		if (isTauri()) startProgress();
		await runSimulation();
		if (isTauri()) completeProgress();
	});

	$effect(() => {
		const _n = nodes;
		const _e = edges;
		if (layoutNodes.length > 0) {
			runSimulation();
		}
	});

	function handleNodeClick(node: LayoutNode) {
		const rawNode = nodes.find((n) => n.id === node.id);
		if (!rawNode) return;
		if (onNodeClick) {
			onNodeClick(rawNode);
		} else {
			goto('/kb/genre/' + node.slug);
		}
	}

	function isFocused(node: LayoutNode): boolean {
		return focusSlug !== null && node.slug === focusSlug;
	}

	function isNeighbor(nodeId: number): boolean {
		if (hoveredId === null) return false;
		return edges.some(
			(e) =>
				(e.from_id === hoveredId && e.to_id === nodeId) ||
				(e.to_id === hoveredId && e.from_id === nodeId)
		);
	}

	function nodeOpacity(nodeId: number): number {
		if (hoveredId === null) return 1;
		if (nodeId === hoveredId || isNeighbor(nodeId)) return 1;
		return 0.25;
	}
</script>

<div class="genre-graph-container" bind:this={container}
     data-ready={layoutNodes.length > 0 ? 'true' : undefined}>
	{#if layoutNodes.length === 0}
		<div class="loading">Building genre graph...</div>
	{:else}
		<svg {width} {height} class="genre-graph-svg" viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet">
			<!-- Edges first (behind nodes) -->
			<g class="edges">
				{#each layoutEdges as edge}
					<line
						x1={edge.x1}
						y1={edge.y1}
						x2={edge.x2}
						y2={edge.y2}
						stroke={edge.rel_type === 'subgenre' ? 'var(--acc)' : 'var(--b-1)'}
						stroke-width={edge.rel_type === 'subgenre' ? 1.5 : 0.75}
						stroke-opacity={edge.rel_type === 'subgenre' ? 0.4 : 0.2}
						stroke-dasharray={edge.rel_type === 'influenced_by' ? '4 3' : undefined}
					/>
				{/each}
			</g>

			<!-- Nodes -->
			<g class="nodes">
				{#each layoutNodes as node}
					{@const w = labelWidth(node.name)}
					{@const focused = isFocused(node)}
					{@const hovered = hoveredId === node.id}
					{@const active = hovered || focused}
					{@const colors = nodeColors(node.type, active)}
					{@const opacity = focused ? 1 : nodeOpacity(node.id)}
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<g
						class="node"
						transform="translate({node.x},{node.y})"
						role="button"
						tabindex="0"
						aria-label={node.name}
						style="opacity: {opacity}; cursor: pointer;"
						onclick={() => handleNodeClick(node)}
						onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node)}
						onmouseenter={() => (hoveredId = node.id)}
						onmouseleave={() => (hoveredId = null)}
					>
						<rect
							x={-w / 2}
							y={-RECT_H / 2}
							width={w}
							height={RECT_H}
							fill={colors.fill}
							stroke={colors.stroke}
							stroke-width={focused ? 2 : 1}
							stroke-dasharray={colors.dasharray}
							style="transition: fill 0.15s, stroke 0.15s;"
						/>
						<text
							text-anchor="middle"
							dy="0.35em"
							font-size={FONT_SIZE}
							fill={colors.text}
							pointer-events="none"
							style="transition: fill 0.15s; user-select: none;"
						>
							{node.name}
						</text>
					</g>
				{/each}
			</g>
		</svg>

		<!-- Legend -->
		<div class="legend">
			<span class="legend-item">
				<svg width="24" height="14" viewBox="0 0 24 14">
					<rect x="0" y="1" width="24" height="12" fill="var(--bg-3)" stroke="var(--b-2)" stroke-width="1"/>
				</svg>
				Genre
			</span>
			<span class="legend-item">
				<svg width="24" height="14" viewBox="0 0 24 14">
					<rect x="0" y="1" width="24" height="12" fill="var(--color-scene, #c07820)" stroke="var(--color-scene-border, #a06010)" stroke-width="1"/>
				</svg>
				Scene
			</span>
			<span class="legend-item">
				<svg width="24" height="14" viewBox="0 0 24 14">
					<rect x="0" y="1" width="24" height="12" fill="transparent" stroke="var(--color-city, #3a8060)" stroke-width="1" stroke-dasharray="4 3"/>
				</svg>
				City
			</span>
		</div>
	{/if}
</div>

<style>
	.genre-graph-container {
		width: 100%;
		position: relative;
		background: var(--bg-base);
		overflow: hidden;
	}

	.genre-graph-svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 400px;
		color: var(--t-3);
		font-size: 0.875rem;
	}

	.node {
		outline: none;
	}

	.legend {
		position: absolute;
		bottom: 12px;
		right: 12px;
		display: flex;
		gap: 12px;
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		padding: 6px 10px;
		font-size: 0.75rem;
		color: var(--t-3);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 5px;
	}
</style>
