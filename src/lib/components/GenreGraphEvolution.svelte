<script lang="ts">
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		type SimulationNodeDatum,
		type SimulationLinkDatum
	} from 'd3-force';
	import type { GenreNode, GenreEdge } from '$lib/db/queries';

	let { currentYear, allNodes, allEdges }: {
		currentYear: number;
		allNodes: GenreNode[];
		allEdges: GenreEdge[];
	} = $props();

	interface LayoutNode extends SimulationNodeDatum {
		id: number;
		slug: string;
		name: string;
		type: 'genre' | 'scene' | 'city';
		inception_year: number | null;
		origin_city: string | null;
		origin_lat: number | null;
		origin_lng: number | null;
		wikidata_id: string | null;
		wikipedia_title: string | null;
		mb_tag: string | null;
		x: number;
		y: number;
	}

	interface LayoutEdge extends SimulationLinkDatum<LayoutNode> {
		source: LayoutNode;
		target: LayoutNode;
		rel_type: string;
	}

	// Reactive derived state — recomputes when currentYear changes
	let visibleNodes = $derived(
		allNodes.filter(n => n.inception_year == null || n.inception_year <= currentYear)
	);
	// Set of visible IDs for O(1) edge membership check
	let visibleNodeIds = $derived(new Set(visibleNodes.map(n => n.id)));
	// Only include edges where BOTH from_id and to_id belong to visible nodes
	let visibleEdges = $derived(
		allEdges.filter(e => visibleNodeIds.has(e.from_id) && visibleNodeIds.has(e.to_id))
	);

	// Build edge count map for node radius scaling
	let edgeCounts = $derived(() => {
		const counts = new Map<number, number>();
		for (const e of visibleEdges) {
			counts.set(e.from_id, (counts.get(e.from_id) ?? 0) + 1);
			counts.set(e.to_id, (counts.get(e.to_id) ?? 0) + 1);
		}
		return counts;
	});

	function nodeRadius(id: number): number {
		const count = edgeCounts().get(id) ?? 0;
		return 4 + Math.sqrt(count) * 2;
	}

	function nodeColor(type: 'genre' | 'scene' | 'city'): string {
		if (type === 'scene') return '#3b82f6';
		if (type === 'city') return '#22c55e';
		return 'var(--color-primary, #60a5fa)';
	}

	function computeLayout(
		nodes: GenreNode[],
		edges: GenreEdge[]
	): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
		const lNodes: LayoutNode[] = nodes.map(n => ({
			...n,
			x: Math.random() * 800,
			y: Math.random() * 400,
		}));
		const idToNode = new Map(lNodes.map(n => [n.id, n]));

		const lEdges: LayoutEdge[] = edges
			.filter(e => idToNode.has(e.from_id) && idToNode.has(e.to_id))
			.map(e => ({
				source: idToNode.get(e.from_id)!,
				target: idToNode.get(e.to_id)!,
				rel_type: e.rel_type,
			}));

		const sim = forceSimulation<LayoutNode>(lNodes)
			.force('link', forceLink<LayoutNode, LayoutEdge>(lEdges).id(d => d.id).distance(60))
			.force('charge', forceManyBody().strength(-120))
			.force('center', forceCenter(400, 200))
			.stop();
		sim.tick(200);

		return { nodes: lNodes, edges: lEdges };
	}

	let layout = $state<{ nodes: LayoutNode[]; edges: LayoutEdge[] }>({ nodes: [], edges: [] });

	// Track which node IDs have already been seen (for new-node animation)
	let seenIds = $state(new Set<number>());

	$effect(() => {
		// Reading visibleNodes/visibleEdges makes $effect re-run on year change
		const newLayout = computeLayout(visibleNodes, visibleEdges);
		// Identify newly appearing nodes for animation
		const newIds = new Set<number>();
		for (const n of newLayout.nodes) {
			if (!seenIds.has(n.id)) {
				newIds.add(n.id);
			}
		}
		if (newIds.size > 0) {
			seenIds = new Set([...seenIds, ...newIds]);
		}
		layout = newLayout;
	});
</script>

<div class="genre-evolution-wrap">
	<svg viewBox="0 0 800 400" width="100%" height="400" aria-label="Genre evolution graph for {currentYear}">
		<!-- Year watermark -->
		<text
			x="400" y="220"
			text-anchor="middle"
			font-size="80"
			opacity="0.05"
			fill="currentColor"
			font-weight="700"
		>{currentYear}</text>

		<!-- Edges -->
		{#each layout.edges as edge}
			{#if edge.source?.x != null && edge.target?.x != null}
				<line
					x1={edge.source.x}
					y1={edge.source.y}
					x2={edge.target.x}
					y2={edge.target.y}
					stroke="var(--color-border, #333)"
					stroke-width="1"
					opacity="0.4"
				/>
			{/if}
		{/each}

		<!-- Nodes -->
		{#each layout.nodes as node}
			{@const r = nodeRadius(node.id)}
			{@const isNew = !seenIds.has(node.id)}
			<g
				transform="translate({node.x}, {node.y})"
				class="genre-node"
				class:new-node={isNew}
			>
				<circle
					r={r}
					fill={nodeColor(node.type)}
					stroke="var(--color-surface-2, #1a1a1a)"
					stroke-width="1.5"
				/>
				{#if (edgeCounts().get(node.id) ?? 0) >= 3}
					<text
						dy="0.35em"
						text-anchor="middle"
						font-size="8"
						fill="var(--color-text, #e0e0e0)"
						opacity="0.8"
						style="pointer-events: none; user-select: none;"
					>{node.name}</text>
				{/if}
			</g>
		{/each}
	</svg>
</div>

<style>
	.genre-evolution-wrap {
		width: 100%;
		background: var(--color-surface-2, #1a1a1a);
		border-radius: 0;
		overflow: hidden;
	}

	.genre-node {
		transition: opacity 0.4s, transform 0.4s;
	}

	.new-node {
		animation: node-appear 0.4s ease-out;
	}

	@keyframes node-appear {
		from {
			opacity: 0;
			transform: scale(0.5);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
