<script lang="ts">
	import { coverPool } from '$lib/cover-pool.svelte';

	let {
		name,
		tags = '',
		sources = [],
		blur = false
	}: {
		name: string;
		tags?: string | null;
		sources?: string[];
		/** true = heavy blur (cross-artist fallback). false = sharp + dimmed (same-artist composite). */
		blur?: boolean;
	} = $props();

	// Deterministic hash — same name always gets same color + font
	function hash(str: string): number {
		let h = 0;
		for (let i = 0; i < str.length; i++) {
			h = Math.imul(31, h) + str.charCodeAt(i) | 0;
		}
		return Math.abs(h);
	}

	// Curated palette — moody, saturated, distinct
	const COLORS = [
		'#2D1B69', // deep violet
		'#6B1A1A', // deep crimson
		'#0D3D2E', // deep forest
		'#0A1F3D', // midnight navy
		'#3D2800', // dark amber
		'#1A0D3D', // indigo night
		'#3D0D2E', // deep magenta
		'#0D2E3D', // deep teal
		'#2E1A00', // burnt umber
		'#0D3D1A', // hunter green
		'#3D1A2E', // plum
		'#00262E', // dark cyan
		'#2E2800', // olive dark
		'#3D0D0D', // dark red
		'#001A2E', // prussian blue
		'#2E0D3D', // grape
		'#1A2E00', // dark lime
		'#3D2E00', // bronze
		'#0D1A3D', // cobalt
		'#2E1A1A', // dark rose
	];

	// Genre → Google Font mapping
	const GENRE_FONTS: Record<string, string> = {
		'jazz':            'Playfair Display',
		'soul':            'Playfair Display',
		'blues':           'Playfair Display',
		'swing':           'Playfair Display',
		'bossa nova':      'Playfair Display',

		'electronic':      'Bebas Neue',
		'techno':          'Bebas Neue',
		'industrial':      'Bebas Neue',
		'ebm':             'Bebas Neue',
		'electronica':     'Bebas Neue',

		'ambient':         'Rajdhani',
		'drone':           'Rajdhani',
		'minimal':         'Rajdhani',
		'new age':         'Rajdhani',

		'metal':           'Metal Mania',
		'black metal':     'Metal Mania',
		'death metal':     'Metal Mania',
		'doom metal':      'Metal Mania',
		'heavy metal':     'Metal Mania',
		'thrash metal':    'Metal Mania',

		'punk':            'Permanent Marker',
		'post-punk':       'Permanent Marker',
		'hardcore':        'Permanent Marker',
		'emo':             'Permanent Marker',

		'hip-hop':         'Anton',
		'hip hop':         'Anton',
		'rap':             'Anton',
		'trap':            'Anton',
		'grime':           'Anton',
		'r&b':             'Anton',

		'folk':            'Abril Fatface',
		'country':         'Abril Fatface',
		'americana':       'Abril Fatface',
		'bluegrass':       'Abril Fatface',
		'singer-songwriter': 'Abril Fatface',

		'shoegaze':        'Pacifico',
		'dream pop':       'Pacifico',
		'psychedelic':     'Pacifico',
		'ethereal':        'Pacifico',

		'classical':       'IM Fell English',
		'baroque':         'IM Fell English',
		'opera':           'IM Fell English',
		'chamber music':   'IM Fell English',

		'experimental':    'Courier Prime',
		'noise':           'Courier Prime',
		'noise rock':      'Courier Prime',
		'avant-garde':     'Courier Prime',

		'krautrock':       'Teko',
		'post-rock':       'Teko',
		'space rock':      'Teko',
		'progressive rock': 'Teko',

		'indie':           'Oswald',
		'indie rock':      'Oswald',
		'alternative':     'Oswald',
		'grunge':          'Oswald',
		'college rock':    'Oswald',

		'chiptune':        'VT323',
		'8-bit':           'VT323',
		'video game':      'VT323',

		'default':         'Space Mono',
	};

	const GOOGLE_FONTS_URL =
		'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Bebas+Neue&family=Rajdhani:wght@600&family=Metal+Mania&family=Permanent+Marker&family=Anton&family=Abril+Fatface&family=Pacifico&family=IM+Fell+English:ital@1&family=Courier+Prime:wght@700&family=Teko:wght@600&family=Oswald:wght@600&family=VT323&family=Space+Mono:wght@700&display=swap';

	let primaryGenre = $derived(
		(tags ?? '').split(/,\s*/).map(t => t.trim().toLowerCase()).find(t => GENRE_FONTS[t]) ?? 'default'
	);

	let bgColor  = $derived(COLORS[hash(name) % COLORS.length]);
	let fontFamily = $derived(GENRE_FONTS[primaryGenre] ?? GENRE_FONTS['default']);

	let fontSize = $derived((() => {
		const len = name.length;
		if (len <= 4)  return '3.2rem';
		if (len <= 7)  return '2.6rem';
		if (len <= 10) return '2rem';
		if (len <= 16) return '1.5rem';
		if (len <= 24) return '1.1rem';
		return '0.9rem';
	})());

	// Pool sources — updated via $effect so the template re-renders when pool fills
	let poolSources = $state<string[]>([]);
	$effect(() => {
		poolSources = coverPool.urls.slice(0, 4);
	});

	// Provided sources take priority; fall back to page-level pool
	let effectiveSources = $derived(sources.length > 0 ? sources : poolSources);

	// Hash-based crop position — each name shows a different fragment of the same image
	// Creates the "parts of it" effect: Aphex Twin's album and his artist card crop differently
	let backdropPos = $derived(
		`${(hash(name) % 70) + 10}% ${((hash(name) >> 8) % 70) + 10}%`
	);
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href={GOOGLE_FONTS_URL} rel="stylesheet" />
</svelte:head>

<div
	class="cover-placeholder"
	style="font-family:'{fontFamily}', sans-serif; font-size:{fontSize};"
	aria-hidden="true"
>
	{#if effectiveSources.length > 0}
		<!-- Image backdrop — dimmed so text stays readable. Sharp for same-artist composites, blurred for cross-artist fallback. -->
		<div class="backdrop" class:mosaic={effectiveSources.length > 1} class:blurred={blur}>
			{#each effectiveSources.slice(0, 4) as src}
				<img
					src={src}
					alt=""
					class="backdrop-img"
					style={effectiveSources.length === 1 ? `object-position: ${backdropPos}` : ''}
				/>
			{/each}
		</div>
		<!-- Genre color tint over the image — preserves artist identity -->
		<div class="color-overlay" style="background:{bgColor}"></div>
		<!-- Appears on hover: lets the user know this isn't official artwork -->
		<div class="generated-notice">Not official artwork</div>
	{:else}
		<div class="solid-bg" style="background:{bgColor}"></div>
	{/if}

	<span class="label">{name}</span>
</div>

<style>
	.cover-placeholder {
		width: 100%;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8% 6%;
		box-sizing: border-box;
		overflow: hidden;
		color: rgba(255, 255, 255, 0.88);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		text-align: center;
		word-break: break-word;
		hyphens: auto;
		/* Subtle inner vignette so text pops */
		box-shadow: inset 0 0 40px rgba(0,0,0,0.35);
	}

	/* ── Image backdrop ─────────────────────────────────── */

	.backdrop {
		position: absolute;
		inset: 0;
		overflow: hidden;
		/* Sharp + dimmed by default — same-artist composite */
		filter: brightness(0.45);
		z-index: 0;
	}

	/* Cross-artist fallback: bleed past edges to hide blur soft borders */
	.backdrop.blurred {
		inset: -12px;
		filter: blur(18px) brightness(0.45) saturate(1.4);
	}

	/* 2×2 mosaic when multiple source images are available */
	.backdrop.mosaic {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
	}

	.backdrop-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Genre color tint — makes each placeholder feel intentional, not random */
	.color-overlay {
		position: absolute;
		inset: 0;
		z-index: 1;
		opacity: 0.28;
	}

	/* ── Plain color fallback (no source images) ─────────── */

	.solid-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	/* ── Typography ─────────────────────────────────────── */

	.label {
		position: relative;
		z-index: 2;
		/* Light shadow helps the text lift off the image texture */
		text-shadow: 0 1px 6px rgba(0,0,0,0.65), 0 0 20px rgba(0,0,0,0.4);
	}

	/* ── "Not official artwork" hover indicator ─────────── */

	.generated-notice {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 5px 8px 6px;
		background: rgba(0, 0, 0, 0.72);
		color: rgba(255, 255, 255, 0.5);
		font-size: 0.58rem;
		font-family: system-ui, sans-serif;
		font-weight: 400;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-align: center;
		z-index: 3;
		opacity: 0;
		transform: translateY(4px);
		transition: opacity 0.2s ease, transform 0.2s ease;
	}

	.cover-placeholder:hover .generated-notice {
		opacity: 1;
		transform: translateY(0);
	}
</style>
