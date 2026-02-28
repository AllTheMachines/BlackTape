<script lang="ts">
	import { onMount } from 'svelte';
	import { startProgress, completeProgress } from '$lib/nav-progress.svelte';
	import { isTauri } from '$lib/platform';
	import {
		forceSimulation,
		forceLink,
		forceManyBody,
		forceCenter,
		forceCollide,
		type SimulationNodeDatum,
	} from 'd3-force';
	import type { StyleMapNode, StyleMapEdge } from '$lib/db/queries';
	import type { ArtistResult } from '$lib/db/queries';

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

	// Zoom + pan state
	let scale = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let svgEl = $state<SVGSVGElement | undefined>(undefined);
	let isPanning = $state(false);
	let panOrigin = { x: 0, y: 0, ox: 0, oy: 0 };
	let panMoved = false;

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (!svgEl) return;
		const rect = svgEl.getBoundingClientRect();
		const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
		const oldScale = scale;
		const newScale = Math.min(Math.max(oldScale * factor, 0.15), 8);
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;
		// Keep world-point under cursor fixed
		const worldX = (svgX - offsetX) / oldScale;
		const worldY = (svgY - offsetY) / oldScale;
		offsetX = svgX - worldX * newScale;
		offsetY = svgY - worldY * newScale;
		scale = newScale;
	}

	function handlePanStart(e: MouseEvent) {
		// Only start pan on left-click on background (target = svg or edges group)
		if ((e.target as SVGElement).closest('.node')) return;
		isPanning = true;
		panMoved = false;
		panOrigin = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
	}

	function handlePanMove(e: MouseEvent) {
		if (!isPanning) return;
		const dx = e.clientX - panOrigin.x;
		const dy = e.clientY - panOrigin.y;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panMoved = true;
		offsetX = panOrigin.ox + dx;
		offsetY = panOrigin.oy + dy;
	}

	function handlePanEnd() {
		isPanning = false;
	}

	// Multi-select state
	let selectedTags = $state<string[]>([]);
	let panelArtists = $state<ArtistResult[]>([]);
	let panelLoading = $state(false);
	let panelSearched = $state(false);

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
		if (initialTag) {
			hoveredTag = initialTag;
			selectedTags = [initialTag];
		}
	}

	function handleNodeClick(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter(t => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
		// Clear previous results when selection changes
		panelArtists = [];
		panelSearched = false;
	}

	function removeTag(tag: string) {
		selectedTags = selectedTags.filter(t => t !== tag);
		panelArtists = [];
		panelSearched = false;
	}

	function clearSelection() {
		selectedTags = [];
		panelArtists = [];
		panelSearched = false;
	}

	async function handleFindArtists() {
		if (selectedTags.length === 0) return;
		panelLoading = true;
		panelSearched = false;
		try {
			const { getProvider } = await import('$lib/db/provider');
			const { getArtistsByTagIntersection } = await import('$lib/db/queries');
			const db = await getProvider();
			panelArtists = await getArtistsByTagIntersection(db, selectedTags, 30);
			panelSearched = true;
		} finally {
			panelLoading = false;
		}
	}

	let discoverUrl = $derived(
		'/discover?tags=' + selectedTags.map(encodeURIComponent).join(',')
	);
</script>

<div class="style-map-container" bind:this={container}
     data-ready={layoutNodes.length > 0 ? 'true' : undefined}>
	{#if layoutNodes.length === 0}
		<div class="loading">Building style map...</div>
	{:else}
		<svg
			{width} {height}
			class="style-map-svg"
			class:panning={isPanning}
			role="application"
			aria-label="Style map — interactive genre graph"
			bind:this={svgEl}
			onwheel={handleWheel}
			onmousedown={handlePanStart}
			onmousemove={handlePanMove}
			onmouseup={handlePanEnd}
			onmouseleave={handlePanEnd}
		>
			<!-- Viewport group — receives zoom + pan transform -->
			<g transform="translate({offsetX},{offsetY}) scale({scale})">
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
						{@const isSelected = selectedTags.includes(node.id)}
						{@const isHovered = hoveredTag === node.id}
						{@const isActive = isSelected || isHovered}
						<g
							class="node"
							transform="translate({node.x},{node.y})"
							role="button"
							tabindex="0"
							aria-label="{node.id}{isSelected ? ' (selected)' : ''}"
							aria-pressed={isSelected}
							onclick={() => { if (!panMoved) handleNodeClick(node.id); }}
							onkeydown={(e) => e.key === 'Enter' && handleNodeClick(node.id)}
							onmouseenter={() => hoveredTag = node.id}
							onmouseleave={() => hoveredTag = null}
						>
							{#if isSelected}
								<!-- Selection ring for selected nodes -->
								<rect
									x={-w / 2 - 3}
									y={-RECT_H / 2 - 3}
									width={w + 6}
									height={RECT_H + 6}
									rx="0"
									fill="none"
									stroke="var(--acc)"
									stroke-width="1.5"
									stroke-opacity="0.5"
									pointer-events="none"
								/>
							{/if}
							<rect
								x={-w / 2}
								y={-RECT_H / 2}
								width={w}
								height={RECT_H}
								rx="0"
								fill={isActive ? 'var(--acc)' : 'var(--bg-3)'}
								stroke={isActive ? 'var(--acc)' : 'var(--b-1)'}
								stroke-width={isSelected ? 1.5 : 1}
								style="cursor: pointer; transition: fill 0.15s, stroke 0.15s;"
							/>
							<text
								text-anchor="middle"
								dy="0.35em"
								font-size={FONT_SIZE}
								fill={isActive ? 'var(--bg-1)' : 'var(--t-2)'}
								pointer-events="none"
								style="transition: fill 0.15s; user-select: none;"
							>
								{node.id}
							</text>
						</g>
					{/each}
				</g>
			</g>
		</svg>

		<!-- Selection panel — slides in when tags are selected -->
		{#if selectedTags.length > 0}
			<div class="tag-panel" data-testid="style-map-panel">
				<div class="tag-panel-header">
					<div class="tag-chips">
						{#each selectedTags as tag (tag)}
							<button class="tag-chip-sel" onclick={() => removeTag(tag)} title="Remove {tag}">
								{tag} ×
							</button>
						{/each}
					</div>
					<div class="tag-panel-actions">
						<button
							class="btn-find-artists"
							onclick={handleFindArtists}
							disabled={panelLoading}
							data-testid="style-map-find-artists"
						>
							{panelLoading ? '…' : 'Find Artists'}
						</button>
						<button class="btn-clear-sel" onclick={clearSelection} title="Clear selection">×</button>
					</div>
				</div>

				{#if panelLoading}
					<div class="panel-loading">Searching…</div>
				{:else if panelSearched && panelArtists.length === 0}
					<div class="panel-empty">No artists match all selected tags.</div>
				{:else if panelArtists.length > 0}
					<div class="panel-results">
						<div class="panel-artist-list">
							{#each panelArtists as artist (artist.id)}
								<a href="/artist/{artist.slug}" class="panel-artist">
									<span class="panel-artist-name">{artist.name}</span>
									{#if artist.country}<span class="panel-artist-country">{artist.country}</span>{/if}
								</a>
							{/each}
						</div>
						<a href={discoverUrl} class="view-all-link">View all in Discover →</a>
					</div>
				{/if}
			</div>
		{/if}
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
		cursor: grab;
		user-select: none;
	}

	.style-map-svg.panning {
		cursor: grabbing;
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

	/* Selection panel */
	.tag-panel {
		border-top: 1px solid var(--b-1);
		background: var(--bg-1);
	}

	.tag-panel-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		flex-wrap: wrap;
	}

	.tag-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
	}

	.tag-chip-sel {
		background: var(--acc);
		color: var(--bg-1);
		border: none;
		padding: 3px 8px;
		font-size: 0.75rem;
		cursor: pointer;
		border-radius: 0;
	}

	.tag-chip-sel:hover {
		filter: brightness(1.15);
	}

	.tag-panel-actions {
		display: flex;
		gap: 6px;
		align-items: center;
		flex-shrink: 0;
	}

	.btn-find-artists {
		background: var(--bg-3);
		color: var(--t-1);
		border: 1px solid var(--b-2);
		padding: 4px 12px;
		font-size: 0.78rem;
		cursor: pointer;
		border-radius: 0;
	}

	.btn-find-artists:hover:not(:disabled) {
		border-color: var(--b-acc);
		color: var(--acc);
	}

	.btn-find-artists:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.btn-clear-sel {
		background: transparent;
		color: var(--t-3);
		border: none;
		font-size: 1rem;
		cursor: pointer;
		padding: 2px 6px;
		line-height: 1;
	}

	.btn-clear-sel:hover {
		color: var(--t-1);
	}

	.panel-loading,
	.panel-empty {
		padding: 10px 12px;
		font-size: 0.78rem;
		color: var(--t-3);
	}

	.panel-results {
		padding: 0 12px 12px;
	}

	.panel-artist-list {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-bottom: 10px;
	}

	.panel-artist {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
		color: var(--t-1);
		font-size: 0.8rem;
		padding: 2px 0;
	}

	.panel-artist:hover .panel-artist-name {
		color: var(--acc);
	}

	.panel-artist-country {
		font-size: 0.7rem;
		color: var(--t-3);
	}

	.view-all-link {
		display: inline-block;
		font-size: 0.75rem;
		color: var(--acc);
		text-decoration: none;
		margin-top: 2px;
	}

	.view-all-link:hover {
		text-decoration: underline;
	}
</style>
