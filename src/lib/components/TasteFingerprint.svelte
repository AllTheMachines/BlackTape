<script lang="ts">
	import { onMount } from 'svelte';
	import { forceSimulation, forceCenter, forceCollide, forceManyBody } from 'd3-force';
	import { tasteProfile } from '$lib/taste/profile.svelte';
	import { isTauri } from '$lib/platform';

	interface FPNode {
		id: string;
		type: 'tag' | 'artist';
		label: string;
		weight: number;
		x?: number;
		y?: number;
	}

	const WIDTH = 500;
	const HEIGHT = 500;
	const cx = WIDTH / 2;
	const cy = HEIGHT / 2;

	let svgEl = $state<SVGElement | null>(null);
	let nodes = $state<(FPNode & { x: number; y: number })[]>([]);
	let links = $state<{ source: FPNode & { x: number; y: number }; target: FPNode & { x: number; y: number } }[]>([]);
	let exporting = $state(false);

	onMount(async () => {
		await buildFingerprint();
	});

	async function buildFingerprint() {
		// Pull collection items — curation signal (CONTEXT.md: "both taste profile + collection")
		let collectionArtistNames: Set<string> = new Set();
		try {
			const { invoke } = await import('@tauri-apps/api/core');
			const items = await invoke<Array<{ item_type: string; item_name: string; artist_mbid?: string }>>('get_all_collection_items');
			items
				.filter(it => it.item_type === 'artist')
				.forEach(it => collectionArtistNames.add(it.item_name));
		} catch {
			// Non-Tauri or empty — fall through to taste-only fingerprint
		}

		const tagNodes: FPNode[] = tasteProfile.tags
			.slice(0, 15)
			.map(t => ({ id: `tag:${t.tag}`, type: 'tag' as const, label: t.tag, weight: t.weight }));

		// Merge tasteProfile.favorites with saved collection artists (deduplicated by name)
		const favoriteNames = new Set(tasteProfile.favorites.map(a => a.artist_name));
		const collectionOnlyArtists: FPNode[] = [...collectionArtistNames]
			.filter(name => !favoriteNames.has(name))
			.slice(0, 5) // cap extra nodes so the constellation stays readable
			.map(name => ({ id: `artist:col:${name}`, type: 'artist' as const, label: name, weight: 0.35 }));

		const artistNodes: FPNode[] = [
			...tasteProfile.favorites
				.slice(0, 10)
				.map(a => ({ id: `artist:${a.artist_mbid}`, type: 'artist' as const, label: a.artist_name, weight: 0.5 })),
			...collectionOnlyArtists, // curation-only artists render slightly smaller (weight 0.35)
		];

		const allNodes: FPNode[] = [...tagNodes, ...artistNodes];

		// Deterministic initial positions — circle layout
		allNodes.forEach((node, i) => {
			node.x = cx + 120 * Math.cos((2 * Math.PI * i) / allNodes.length);
			node.y = cy + 120 * Math.sin((2 * Math.PI * i) / allNodes.length);
		});

		const simulation = forceSimulation(allNodes as any)
			.force('center', forceCenter(cx, cy))
			.force('charge', forceManyBody().strength(-40))
			.force('collide', forceCollide().radius((d: any) => (d as FPNode).weight * 10 + 8));

		// Headless: run all ticks at once
		simulation.tick(300);
		simulation.stop();

		const settled = allNodes as (FPNode & { x: number; y: number })[];
		nodes = settled;

		// Build edges: each artist connects to 2 nearest tag nodes by Euclidean distance
		const tagSettled = settled.filter(n => n.type === 'tag');
		const artistSettled = settled.filter(n => n.type === 'artist');

		const builtLinks: { source: FPNode & { x: number; y: number }; target: FPNode & { x: number; y: number } }[] = [];
		for (const artist of artistSettled) {
			const closest = [...tagSettled]
				.sort((a, b) => {
					const da = Math.hypot(a.x - artist.x, a.y - artist.y);
					const db = Math.hypot(b.x - artist.x, b.y - artist.y);
					return da - db;
				})
				.slice(0, 2);
			for (const tag of closest) {
				builtLinks.push({ source: artist, target: tag });
			}
		}
		links = builtLinks;
	}

	function nodeRadius(node: FPNode): number {
		if (node.type === 'tag') return Math.max(4, Math.min(node.weight * 12, 18));
		return 5;
	}

	async function exportPng() {
		if (!svgEl || exporting) return;
		exporting = true;
		try {
			const svgData = new XMLSerializer().serializeToString(svgEl);
			const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(svgBlob);

			await new Promise<void>((resolve, reject) => {
				const img = new Image();
				img.onload = async () => {
					const canvas = document.createElement('canvas');
					canvas.width = 800;
					canvas.height = 800;
					const ctx = canvas.getContext('2d')!;
					ctx.fillStyle = '#0d0d0d';
					ctx.fillRect(0, 0, 800, 800);
					ctx.drawImage(img, 0, 0, 800, 800);
					URL.revokeObjectURL(url);

					const pngData = canvas.toDataURL('image/png');
					const base64 = pngData.split(',')[1];

					try {
						const { invoke } = await import('@tauri-apps/api/core');
						const { save } = await import('@tauri-apps/plugin-dialog');
						const path = await save({
							defaultPath: 'mercury-taste-fingerprint.png',
							filters: [{ name: 'PNG Image', extensions: ['png'] }],
						});
						if (path) {
							await invoke('save_base64_to_file', { path, data: base64 });
						}
					} catch {
						// Web fallback
						const a = document.createElement('a');
						a.href = pngData;
						a.download = 'mercury-taste-fingerprint.png';
						a.click();
					}
					resolve();
				};
				img.onerror = reject;
				img.src = url;
			});
		} finally {
			exporting = false;
		}
	}
</script>

{#if tasteProfile.tags.length === 0 && tasteProfile.favorites.length === 0}
	<div class="fingerprint-empty">
		<p>Your Taste Fingerprint will appear here once you've saved some artists or listened to local tracks.</p>
	</div>
{:else}
	<div class="fingerprint-wrapper" data-ready={nodes.length > 0 ? 'true' : undefined}>
		<svg
			bind:this={svgEl}
			class="fingerprint-svg"
			viewBox="0 0 {WIDTH} {HEIGHT}"
			width={WIDTH}
			height={HEIGHT}
			xmlns="http://www.w3.org/2000/svg"
		>
			<!-- Background -->
			<rect width={WIDTH} height={HEIGHT} fill="#0d0d0d" />

			<!-- Edges -->
			{#each links as link}
				<line
					x1={link.source.x}
					y1={link.source.y}
					x2={link.target.x}
					y2={link.target.y}
					stroke="rgba(255,255,255,0.12)"
					stroke-width="1"
				/>
			{/each}

			<!-- Nodes -->
			{#each nodes as node}
				<g transform="translate({node.x},{node.y})">
					<circle
						r={nodeRadius(node)}
						fill={node.type === 'tag' ? 'var(--accent, #7c6af7)' : 'rgba(255,255,255,0.4)'}
						opacity={node.type === 'tag' ? 0.8 : 0.6}
					/>
					{#if node.type === 'tag'}
						<text
							y={nodeRadius(node) + 10}
							text-anchor="middle"
							fill="rgba(255,255,255,0.6)"
							font-size="8"
							font-family="system-ui, sans-serif"
						>{node.label}</text>
					{/if}
				</g>
			{/each}
		</svg>

		<button class="export-btn" onclick={exportPng} disabled={exporting}>
			{exporting ? 'Exporting...' : 'Export as PNG'}
		</button>
	</div>
{/if}

<style>
	.fingerprint-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-sm);
	}
	.fingerprint-svg {
		border-radius: 8px;
		max-width: 100%;
	}
	.fingerprint-empty {
		padding: var(--spacing-md);
		color: var(--text-muted);
		font-size: 0.875rem;
		text-align: center;
	}
	.export-btn {
		padding: 6px 16px;
		background: var(--bg-secondary);
		border: 1px solid var(--border);
		color: var(--text-primary);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.export-btn:hover:not(:disabled) { border-color: var(--accent); }
	.export-btn:disabled { opacity: 0.5; cursor: default; }
</style>
