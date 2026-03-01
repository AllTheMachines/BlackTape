<script lang="ts">
	let {
		name,
		tags = ''
	}: {
		name: string;
		tags?: string | null;
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
	// Fonts cover a wide range of moods and visual personalities
	const GENRE_FONTS: Record<string, string> = {
		// Jazz, soul, blues — elegant editorial
		'jazz':            'Playfair Display',
		'soul':            'Playfair Display',
		'blues':           'Playfair Display',
		'swing':           'Playfair Display',
		'bossa nova':      'Playfair Display',

		// Electronic, techno, industrial — geometric/mechanical
		'electronic':      'Bebas Neue',
		'techno':          'Bebas Neue',
		'industrial':      'Bebas Neue',
		'ebm':             'Bebas Neue',
		'electronica':     'Bebas Neue',

		// Ambient, drone, minimal — thin and spacious
		'ambient':         'Rajdhani',
		'drone':           'Rajdhani',
		'minimal':         'Rajdhani',
		'new age':         'Rajdhani',

		// Metal, black metal, doom — gothic weight
		'metal':           'Metal Mania',
		'black metal':     'Metal Mania',
		'death metal':     'Metal Mania',
		'doom metal':      'Metal Mania',
		'heavy metal':     'Metal Mania',
		'thrash metal':    'Metal Mania',

		// Punk, post-punk, hardcore — aggressive hand-drawn
		'punk':            'Permanent Marker',
		'post-punk':       'Permanent Marker',
		'hardcore':        'Permanent Marker',
		'emo':             'Permanent Marker',

		// Hip-hop, rap, trap — bold condensed
		'hip-hop':         'Anton',
		'hip hop':         'Anton',
		'rap':             'Anton',
		'trap':            'Anton',
		'grime':           'Anton',
		'r&b':             'Anton',

		// Folk, country, americana — rustic slab
		'folk':            'Abril Fatface',
		'country':         'Abril Fatface',
		'americana':       'Abril Fatface',
		'bluegrass':       'Abril Fatface',
		'singer-songwriter': 'Abril Fatface',

		// Shoegaze, dream pop, psychedelic — flowing soft
		'shoegaze':        'Pacifico',
		'dream pop':       'Pacifico',
		'psychedelic':     'Pacifico',
		'ethereal':        'Pacifico',

		// Classical, baroque, contemporary classical
		'classical':       'IM Fell English',
		'baroque':         'IM Fell English',
		'opera':           'IM Fell English',
		'chamber music':   'IM Fell English',

		// Experimental, noise, avant-garde — typewriter
		'experimental':    'Courier Prime',
		'noise':           'Courier Prime',
		'noise rock':      'Courier Prime',
		'avant-garde':     'Courier Prime',

		// Krautrock, post-rock, space rock — geometric
		'krautrock':       'Teko',
		'post-rock':       'Teko',
		'space rock':      'Teko',
		'progressive rock': 'Teko',

		// Indie, alternative, college rock
		'indie':           'Oswald',
		'indie rock':      'Oswald',
		'alternative':     'Oswald',
		'grunge':          'Oswald',
		'college rock':    'Oswald',

		// Chiptune, video game, 8-bit
		'chiptune':        'VT323',
		'8-bit':           'VT323',
		'video game':      'VT323',

		// Default
		'default':         'Space Mono',
	};

	const GOOGLE_FONTS_URL =
		'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Bebas+Neue&family=Rajdhani:wght@600&family=Metal+Mania&family=Permanent+Marker&family=Anton&family=Abril+Fatface&family=Pacifico&family=IM+Fell+English:ital@1&family=Courier+Prime:wght@700&family=Teko:wght@600&family=Oswald:wght@600&family=VT323&family=Space+Mono:wght@700&display=swap';

	let primaryGenre = $derived(
		(tags ?? '').split(/,\s*/).map(t => t.trim().toLowerCase()).find(t => GENRE_FONTS[t]) ?? 'default'
	);

	let bgColor  = $derived(COLORS[hash(name) % COLORS.length]);
	let fontFamily = $derived(GENRE_FONTS[primaryGenre] ?? GENRE_FONTS['default']);

	// Scale font size by name length — shorter names fill bigger
	let fontSize = $derived((() => {
		const len = name.length;
		if (len <= 4)  return '3.2rem';
		if (len <= 7)  return '2.6rem';
		if (len <= 10) return '2rem';
		if (len <= 16) return '1.5rem';
		if (len <= 24) return '1.1rem';
		return '0.9rem';
	})());
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href={GOOGLE_FONTS_URL} rel="stylesheet" />
</svelte:head>

<div
	class="cover-placeholder"
	style="background:{bgColor}; font-family:'{fontFamily}', sans-serif; font-size:{fontSize};"
	aria-hidden="true"
>
	{name}
</div>

<style>
	.cover-placeholder {
		width: 100%;
		height: 100%;
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
</style>
