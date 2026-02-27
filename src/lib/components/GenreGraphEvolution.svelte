<script lang="ts">
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		forceCollide,
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
		x: number;
		y: number;
	}

	interface LayoutEdge extends SimulationLinkDatum<LayoutNode> {
		source: LayoutNode;
		target: LayoutNode;
		rel_type: string;
	}

	const FONT_SIZE = 10;
	const CHAR_WIDTH = 6;
	const PAD_X = 8;
	const PAD_Y = 4;
	const RECT_H = FONT_SIZE + PAD_Y * 2;

	function labelWidth(name: string): number {
		return Math.max(40, name.length * CHAR_WIDTH + PAD_X * 2);
	}

	function nodeColors(type: 'genre' | 'scene' | 'city') {
		if (type === 'genre') return {
			fill: 'var(--bg-3)',
			stroke: 'var(--b-2)',
			text: 'var(--t-2)',
			dasharray: undefined as string | undefined
		};
		if (type === 'scene') return {
			fill: 'var(--color-scene, #c07820)',
			stroke: 'var(--color-scene-border, #a06010)',
			text: 'var(--bg-1)',
			dasharray: undefined as string | undefined
		};
		return {
			fill: 'transparent',
			stroke: 'var(--color-city, #3a8060)',
			text: 'var(--color-city, #3a8060)',
			dasharray: '3 2' as string | undefined
		};
	}

	// Reactive derived: filter nodes/edges visible up to currentYear
	let visibleNodes = $derived(
		allNodes.filter(n => n.inception_year == null || n.inception_year <= currentYear)
	);
	let visibleNodeIds = $derived(new Set(visibleNodes.map(n => n.id)));
	let visibleEdges = $derived(
		allEdges.filter(e => visibleNodeIds.has(e.from_id) && visibleNodeIds.has(e.to_id))
	);

	let layout = $state<{ nodes: LayoutNode[]; edges: LayoutEdge[] }>({ nodes: [], edges: [] });
	let seenIds = $state(new Set<number>());

	// Generation counter for cancellation — stale async runs check this
	let currentGen = 0;

	$effect(() => {
		// Capture reactive deps
		const nodes = visibleNodes;
		const edges = visibleEdges;
		const gen = ++currentGen;
		runLayout(nodes, edges, gen);
	});

	async function runLayout(nodes: GenreNode[], edges: GenreEdge[], gen: number) {
		if (nodes.length === 0) return;

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
			.force('link', forceLink<LayoutNode, LayoutEdge>(lEdges).id((d: any) => d.id).distance(60))
			.force('charge', forceManyBody().strength(-120))
			.force('center', forceCenter(400, 200))
			.force('collide', forceCollide().radius((d: any) => labelWidth(d.name) / 2 + 4));

		// Chunked async ticking with cancellation
		const CHUNK = 25;
		const TOTAL = 150;
		let done = 0;
		await new Promise<void>(resolve => {
			function step() {
				if (gen !== currentGen) { resolve(); return; } // cancelled by newer run
				sim.tick(Math.min(CHUNK, TOTAL - done));
				done += CHUNK;
				if (done < TOTAL) requestAnimationFrame(step);
				else resolve();
			}
			requestAnimationFrame(step);
		});

		if (gen !== currentGen) return; // stale — a newer run took over
		sim.stop();

		// Track new nodes for appear animation
		const newIds = new Set<number>();
		for (const n of lNodes) {
			if (!seenIds.has(n.id)) newIds.add(n.id);
		}
		if (newIds.size > 0) {
			seenIds = new Set([...seenIds, ...newIds]);
		}

		layout = { nodes: lNodes, edges: lEdges };
	}
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
					stroke={edge.rel_type === 'subgenre' ? 'var(--acc)' : 'var(--b-1)'}
					stroke-width={edge.rel_type === 'subgenre' ? 1.5 : 0.75}
					stroke-opacity={edge.rel_type === 'subgenre' ? 0.4 : 0.2}
					stroke-dasharray={edge.rel_type === 'influenced_by' ? '4 3' : undefined}
				/>
			{/if}
		{/each}

		<!-- Nodes -->
		{#each layout.nodes as node}
			{@const w = labelWidth(node.name)}
			{@const colors = nodeColors(node.type)}
			{@const isNew = !seenIds.has(node.id)}
			<g
				transform="translate({node.x}, {node.y})"
				class="genre-node"
				class:new-node={isNew}
			>
				<rect
					x={-w / 2}
					y={-RECT_H / 2}
					width={w}
					height={RECT_H}
					fill={colors.fill}
					stroke={colors.stroke}
					stroke-width="1"
					stroke-dasharray={colors.dasharray}
				/>
				<text
					dy="0.35em"
					text-anchor="middle"
					font-size={FONT_SIZE}
					fill={colors.text}
					style="pointer-events: none; user-select: none;"
				>{node.name}</text>
			</g>
		{/each}
	</svg>
</div>

<style>
	.genre-evolution-wrap {
		width: 100%;
		background: var(--bg-2);
		overflow: hidden;
	}

	.genre-node {
		transition: opacity 0.4s;
	}

	.new-node {
		animation: node-appear 0.4s ease-out;
	}

	@keyframes node-appear {
		from { opacity: 0; transform: scale(0.5); }
		to   { opacity: 1; transform: scale(1); }
	}
</style>
