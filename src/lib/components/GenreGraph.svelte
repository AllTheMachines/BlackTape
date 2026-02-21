<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
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

	// Compute radius from raw node type + connectivity from edges prop
	function rawNodeRadius(nodeId: number, nodeType: 'genre' | 'scene' | 'city'): number {
		const degree = edges.filter((e) => e.from_id === nodeId || e.to_id === nodeId).length;
		const baseByType = nodeType === 'genre' ? 12 : nodeType === 'scene' ? 9 : 6;
		// Log scale connectivity bonus, clamped
		const bonus = degree > 0 ? Math.min(12, Math.log10(degree + 1) * 6) : 0;
		return Math.max(baseByType, baseByType + bonus);
	}

	// Build the diamond polygon points for scene nodes (rotated square)
	function diamondPoints(cx: number, cy: number, r: number): string {
		return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
	}

	function runSimulation() {
		if (!nodes || nodes.length === 0) return;

		const simNodes: SimNode[] = nodes.map((n) => ({
			id: n.id,
			slug: n.slug,
			name: n.name,
			type: n.type
		}));

		// Map node id -> radius for collision
		const radiusMap = new Map(nodes.map((n) => [n.id, rawNodeRadius(n.id, n.type)]));

		// Edge strength: subgenre links are stronger than influenced_by
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
				forceCollide().radius((d: any) => (radiusMap.get(d.id) ?? 10) + 6)
			);

		// Headless tick — no on('tick') wiring to Svelte state (same pattern as StyleMap)
		simulation.tick(300);
		const settled = simulation.nodes() as LayoutNode[];
		simulation.stop();

		// Build node lookup for edge position computation
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

	onMount(() => {
		width = container.clientWidth || 800;
		height = Math.max(500, window.innerHeight - 200);
		runSimulation();
	});

	// Re-run simulation when nodes/edges change (subgraph expansion)
	$effect(() => {
		// Track nodes and edges for reactivity
		const _n = nodes;
		const _e = edges;
		if (layoutNodes.length > 0) {
			// Container is already mounted — re-run simulation
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

	// Determine if a node is focused (for focusSlug emphasis)
	function isFocused(node: LayoutNode): boolean {
		return focusSlug !== null && node.slug === focusSlug;
	}

	// Determine neighbors of hovered node for highlight/dim logic
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

<div class="genre-graph-container" bind:this={container}>
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
						stroke={edge.rel_type === 'subgenre'
							? 'var(--text-accent, #7c6af7)'
							: 'var(--border-default, #444)'}
						stroke-width={edge.rel_type === 'subgenre' ? 1.5 : 0.75}
						stroke-opacity={edge.rel_type === 'subgenre' ? 0.5 : 0.25}
						stroke-dasharray={edge.rel_type === 'influenced_by' ? '4 3' : undefined}
					/>
				{/each}
			</g>

			<!-- Nodes -->
			<g class="nodes">
				{#each layoutNodes as node}
					{@const r = rawNodeRadius(node.id, node.type)}
					{@const focused = isFocused(node)}
					{@const hovered = hoveredId === node.id}
					{@const opacity = nodeOpacity(node.id)}
					<!-- svelte-ignore a11y_interactive_supports_focus -->
					<g
						class="node"
						transform="translate({node.x},{node.y})"
						role="button"
						tabindex="0"
						aria-label={node.name}
						style="opacity: {focused ? 1 : opacity}; cursor: pointer;"
						onclick={() => handleNodeClick(node)}
						onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node)}
						onmouseenter={() => (hoveredId = node.id)}
						onmouseleave={() => (hoveredId = null)}
					>
						{#if node.type === 'genre'}
							<!-- Genre: filled circle, primary color -->
							<circle
								r={focused ? r * 1.4 : r}
								fill={hovered || focused
									? 'var(--text-accent, #7c6af7)'
									: 'var(--bg-elevated, #2a2a2a)'}
								stroke={hovered || focused
									? 'var(--text-accent, #7c6af7)'
									: 'var(--border-default, #555)'}
								stroke-width={focused ? 2.5 : 1.5}
								style="transition: fill 0.15s, stroke 0.15s, r 0.2s;"
							/>
						{:else if node.type === 'scene'}
							<!-- Scene: diamond shape, distinct warm color -->
							<polygon
								points={diamondPoints(0, 0, focused ? r * 1.4 : r)}
								fill={hovered || focused
									? 'var(--color-scene-hover, #f0a030)'
									: 'var(--color-scene, #c07820)'}
								stroke={hovered || focused
									? 'var(--color-scene-hover, #f0a030)'
									: 'var(--color-scene-border, #a06010)'}
								stroke-width="1.5"
								style="transition: fill 0.15s, stroke 0.15s;"
							/>
						{:else}
							<!-- City: small circle with dashed border -->
							<circle
								r={focused ? r * 1.4 : r}
								fill="transparent"
								stroke={hovered || focused
									? 'var(--color-city-hover, #60c090)'
									: 'var(--color-city, #3a8060)'}
								stroke-width="1.5"
								stroke-dasharray="3 2"
								style="transition: stroke 0.15s, r 0.2s;"
							/>
							<circle
								r={Math.max(2, (focused ? r * 1.4 : r) * 0.4)}
								fill={hovered || focused
									? 'var(--color-city-hover, #60c090)'
									: 'var(--color-city, #3a8060)'}
								style="transition: fill 0.15s;"
							/>
						{/if}

						<!-- Node label — show for larger nodes or when hovered -->
						{#if r > 9 || hovered || focused}
							<text
								text-anchor="middle"
								dy={node.type === 'city' ? (focused ? r * 1.4 : r) + 10 : '0.35em'}
								font-size={Math.max(8, Math.min(13, r * 0.75))}
								fill={hovered || focused ? 'var(--text-primary, #fff)' : 'var(--text-secondary, #aaa)'}
								pointer-events="none"
								style="transition: fill 0.15s; user-select: none;"
							>
								{node.name}
							</text>
						{/if}
					</g>
				{/each}
			</g>
		</svg>

		<!-- Legend -->
		<div class="legend">
			<span class="legend-item legend-genre">
				<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="var(--bg-elevated, #2a2a2a)" stroke="var(--border-default, #555)" stroke-width="1.5"/></svg>
				Genre
			</span>
			<span class="legend-item legend-scene">
				<svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,6 6,11 1,6" fill="var(--color-scene, #c07820)" stroke="var(--color-scene-border, #a06010)" stroke-width="1.5"/></svg>
				Scene
			</span>
			<span class="legend-item legend-city">
				<svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="transparent" stroke="var(--color-city, #3a8060)" stroke-width="1.5" stroke-dasharray="3 2"/><circle cx="6" cy="6" r="2" fill="var(--color-city, #3a8060)"/></svg>
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
		border-radius: 8px;
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
		color: var(--text-muted);
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
		background: var(--bg-elevated, #1e1e1e);
		border: 1px solid var(--border-default, #444);
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 0.75rem;
		color: var(--text-secondary, #aaa);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 5px;
	}
</style>
