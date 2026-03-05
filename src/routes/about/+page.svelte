<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';
	import { page } from '$app/stores';
	import aboutBanner from '$lib/assets/about-banner.png';

	const WORKER_URL = 'https://blacktape-signups.theaterofdelays.workers.dev/feedback';

	let feedbackType = $state('bug');
	let feedbackTitle = $state('');
	let feedbackBody = $state('');
	let feedbackEmail = $state('');
	let feedbackSent = $state(false);
	let feedbackError = $state('');
	let feedbackSending = $state(false);

	const PLACEHOLDERS: Record<string, { title: string; body: string }> = {
		bug: {
			title: 'e.g. Search returns no results for certain tag names',
			body: 'Steps to reproduce:\n1. \n2. \n\nExpected:\n\nActual:\n',
		},
		suggestion: {
			title: 'e.g. Add keyboard shortcut to open search',
			body: 'Describe your idea and why it would help...',
		},
		other: {
			title: 'Short summary',
			body: 'What\'s on your mind?',
		},
	};

	let titlePlaceholder = $derived(PLACEHOLDERS[feedbackType]?.title ?? '');
	let bodyPlaceholder = $derived(PLACEHOLDERS[feedbackType]?.body ?? '');

	async function sendFeedback() {
		if (!feedbackTitle.trim() || !feedbackBody.trim()) return;
		feedbackSending = true;
		feedbackError = '';
		try {
			const res = await fetch(WORKER_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: feedbackType,
					title: feedbackTitle.trim(),
					body: feedbackBody.trim(),
					replyTo: feedbackEmail.trim() || null,
					context: { page: $page.url.pathname },
				}),
			});
			if (!res.ok) throw new Error(`Server error: ${res.status}`);
			feedbackSent = true;
		} catch (e) {
			feedbackError = e instanceof Error ? e.message : 'Failed to send — try again.';
		} finally {
			feedbackSending = false;
		}
	}
</script>

<svelte:head>
	<title>About — {PROJECT_NAME}</title>
</svelte:head>

<div class="about-page">
	<div class="about-banner-strip">
		<img src={aboutBanner} alt="" class="about-banner-img" aria-hidden="true" />
	</div>
	<div class="about-header">
		<h1>{PROJECT_NAME}</h1>
		<p class="tagline">{PROJECT_TAGLINE}</p>
	</div>

	<section class="about-section manifesto-section">
		<h2>The problem</h2>
		<p>Streaming has solved access and broken discovery. Every recording ever made is theoretically available — yet the same few thousand artists capture almost everything. The algorithms that decide what you hear next are built to maximise session length, not to help you find something you've never encountered. The underground isn't hidden because it doesn't exist. It's hidden because it doesn't perform.</p>
		<p>Most music earns nothing. Not because it isn't good — because no algorithm ever pointed anyone toward it. The long tail is real. It just isn't being explored.</p>
	</section>

	<section class="about-section manifesto-section">
		<h2>The solution</h2>
		<p>{PROJECT_NAME} is a discovery engine, not a streaming platform. It doesn't host audio. It doesn't serve ads. It doesn't have a recommendation engine trying to keep you inside it. It indexes everything from open databases, embeds players from wherever music already lives, and gets out of the way.</p>
		<p>The core inversion: niche artists surface first, not last. The less well-known you are, the more {PROJECT_NAME} rewards your discoverability. Search by tag combination and an underground artist with three matching tags ranks above a major act with fifty. That's the whole premise.</p>
	</section>

	<section class="about-section manifesto-section">
		<h2>The philosophy</h2>
		<ul class="manifesto-list">
			<li><strong>No tracking.</strong> No behavioural data collected. No listening history uploaded. No account required.</li>
			<li><strong>No ads.</strong> Discovery should be clean. Ads are a conflict of interest — what you're shown should reflect what you asked for, not what someone paid to show you.</li>
			<li><strong>No algorithmic manipulation.</strong> Ranking is transparent: uniqueness score, tag match, country, era. No hidden signals. No engagement optimisation.</li>
			<li><strong>No audio hosting.</strong> Music lives on the artist's infrastructure. {PROJECT_NAME} embeds it from there. If Bandcamp goes down, you lose the Bandcamp embed — not the artist's catalogue.</li>
			<li><strong>Open source, public good, free forever.</strong> The community owns the direction. No acquisition path. No paywall.</li>
		</ul>
	</section>

	<section class="about-section">
		<h2>The data</h2>
		<p><a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a> is the backbone: 2.6 million artists, 4.7 million releases, 35 million recordings, all CC0 public domain. Maintained by a global community of volunteers who believe music metadata should be a commons. <a href="https://www.discogs.com" target="_blank" rel="noopener">Discogs</a> fills in release details, especially for genres that MusicBrainz covers less thoroughly.</p>
		<p>No proprietary data. No locked-in sources. If MusicBrainz or Discogs disappears, the methodology can be applied to any equivalent open dataset. The database is distributed — you download it, you own a copy of it.</p>
		<p>Notice missing cover art, wrong release dates, or an artist with no tags? <a href="https://musicbrainz.org/doc/How_to_Create_an_Account" target="_blank" rel="noopener">Anyone can edit MusicBrainz</a> — create a free account and fix it directly. Cover art is hosted separately at <a href="https://coverartarchive.org" target="_blank" rel="noopener">Cover Art Archive</a>; you can upload artwork there for any release in the MusicBrainz database. Improvements you make flow into the next database update and benefit everyone using this app.</p>
	</section>

	<section class="about-section">
		<h2>The technology</h2>
		<p>The search index runs locally on your device — a SQLite database with full-text search. Searches are instant because there's no network round-trip. The index is a snapshot of the open databases, updated as new dumps are released.</p>
		<p>Artist pages are assembled live from the <a href="https://musicbrainz.org/doc/MusicBrainz_API" target="_blank" rel="noopener">MusicBrainz API</a> — releases, relationships, credits, tags. Cover art from the <a href="https://coverartarchive.org" target="_blank" rel="noopener">Cover Art Archive</a>. Players embedded from Bandcamp, Spotify, SoundCloud, and YouTube — whichever the artist has made available.</p>
		<p>The app runs as a native desktop application via <a href="https://tauri.app" target="_blank" rel="noopener">Tauri</a>. No Electron overhead. No browser tab. Your library and preferences stay on your machine.</p>
	</section>

	<section class="about-section manifesto-section">
		<h2>What's coming</h2>
		<p>This is version 1. The infrastructure is in place. The things being built next:</p>
		<ul class="manifesto-list">
			<li><strong>Taste fingerprint.</strong> A constellation of your listening — derived from your library and play history, never uploaded. Shows you where you've been and where the edges of your taste are.</li>
			<li><strong>Scene maps.</strong> Geographic visualisation of scenes by origin city and decade. Watch how sounds spread, where they started, who carried them.</li>
			<li><strong>Community writing.</strong> Open liner notes, artist bios, scene histories — written by listeners, not generated by machines.</li>
			<li><strong>Artist claiming.</strong> Artists own their page. Verified artists can update their bio, add links, and flag incorrect data.</li>
			<li><strong>Cross-platform sync.</strong> Encrypted, peer-to-peer. Your taste travels with you without going through any server.</li>
		</ul>
	</section>

	<section class="about-section">
		<h2>Credits</h2>
		<p>Built on the shoulders of <a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a>, <a href="https://www.discogs.com" target="_blank" rel="noopener">Discogs</a>, and <a href="https://coverartarchive.org" target="_blank" rel="noopener">Cover Art Archive</a>. Powered by <a href="https://tauri.app" target="_blank" rel="noopener">Tauri</a>, <a href="https://kit.svelte.dev" target="_blank" rel="noopener">SvelteKit</a>, and SQLite. Distributed via Cloudflare. Open source throughout.</p>
	</section>

	<section id="feedback" class="about-section">
		<h2>Feedback</h2>
		<p>Found a bug? Have a suggestion? All feedback is read and appreciated.</p>
		{#if feedbackSent}
			<p class="feedback-thanks">Received — thanks for taking the time.</p>
		{:else}
			<div class="feedback-form">
				<div class="feedback-row">
					<select bind:value={feedbackType} class="feedback-select">
						<option value="bug">Bug report</option>
						<option value="suggestion">Suggestion</option>
						<option value="other">Other</option>
					</select>
				</div>
				<input
					type="text"
					placeholder={titlePlaceholder}
					bind:value={feedbackTitle}
					class="feedback-input"
					maxlength="120"
				/>
				<textarea
					placeholder={bodyPlaceholder}
					bind:value={feedbackBody}
					class="feedback-textarea"
					rows="5"
				></textarea>
				<input
					type="email"
					placeholder="Your email (optional — for replies)"
					bind:value={feedbackEmail}
					class="feedback-input"
				/>
				<button
					onclick={sendFeedback}
					disabled={feedbackSending || !feedbackTitle.trim() || !feedbackBody.trim()}
					class="feedback-submit"
				>{feedbackSending ? 'Sending...' : 'Send feedback'}</button>
				{#if feedbackError}<p class="feedback-error">{feedbackError}</p>{/if}
			</div>
		{/if}
	</section>

	<div class="about-ctas">
		<a href="/" class="cta-primary">Start discovering &rarr;</a>
	</div>
</div>

<style>
	.about-page {
		padding: 20px;
		max-width: 720px;
	}

	.about-banner-strip {
		width: calc(100% + 40px);
		margin: -20px -20px 0 -20px;
		height: 200px;
		min-height: 200px;
		max-height: 200px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.about-banner-img {
		width: 100%;
		height: 200px;
		object-fit: cover;
		object-position: center top;
		display: block;
		transform: scale(1.05);
		transform-origin: center top;
	}

	.about-header {
		margin-bottom: var(--space-xl, 2rem);
	}

	.about-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs, 0.25rem) 0;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	.tagline {
		font-size: 0.9rem;
		color: var(--t-3);
		margin: 0;
	}

	.about-section {
		padding-top: var(--space-lg, 1.5rem);
		border-top: 1px solid var(--b-1);
		margin-top: var(--space-lg, 1.5rem);
	}

	.about-section h2 {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--t-2);
		margin: 0 0 var(--space-sm, 0.75rem) 0;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.about-section p {
		font-size: 0.9rem;
		color: var(--t-3);
		line-height: 1.8;
		margin: 0 0 0.75rem 0;
	}

	.about-section p:last-of-type {
		margin-bottom: 0;
	}

	.about-section a {
		color: var(--acc);
		text-decoration: none;
	}

	.about-section a:hover {
		text-decoration: underline;
	}

	/* Manifesto paragraphs — slightly larger, more breathing room */
	.manifesto-section p {
		font-size: 0.93rem;
		line-height: 1.85;
	}

	.manifesto-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.manifesto-list li {
		font-size: 0.9rem;
		color: var(--t-3);
		line-height: 1.7;
		padding-left: 1.1em;
		position: relative;
	}

	.manifesto-list li::before {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--acc);
	}

	.manifesto-list strong {
		color: var(--t-2);
		font-weight: 600;
	}

	.about-ctas {
		display: flex;
		gap: var(--space-md, 1rem);
		margin-top: var(--space-xl, 2rem);
		padding-top: var(--space-lg, 1.5rem);
		border-top: 1px solid var(--b-1);
	}

	.cta-primary {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--acc);
		text-decoration: none;
		padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
		border: 1px solid var(--acc);
		border-radius: 0;
		transition: background 0.15s, color 0.15s;
	}

	.cta-primary:hover {
		background: var(--acc);
		color: var(--bg-base, #0a0a0a);
	}

	.feedback-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
		max-width: 480px;
	}

	.feedback-row {
		display: flex;
		gap: 8px;
	}

	.feedback-select,
	.feedback-input,
	.feedback-textarea {
		background: var(--bg-3);
		border: 1px solid var(--b-1);
		color: var(--t-1);
		font-size: 0.85rem;
		font-family: inherit;
		padding: 6px 8px;
		border-radius: 0;
		width: 100%;
		box-sizing: border-box;
	}

	.feedback-select {
		width: auto;
		cursor: pointer;
	}

	.feedback-select:focus,
	.feedback-input:focus,
	.feedback-textarea:focus {
		outline: none;
		border-color: var(--acc);
	}

	.feedback-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.feedback-submit {
		align-self: flex-start;
		background: transparent;
		border: 1px solid var(--acc);
		color: var(--acc);
		font-size: 0.85rem;
		font-family: inherit;
		padding: 6px 16px;
		cursor: pointer;
		border-radius: 0;
		transition: background 0.15s, color 0.15s;
	}

	.feedback-submit:hover:not(:disabled) {
		background: var(--acc);
		color: var(--bg-base, #0a0a0a);
	}

	.feedback-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.feedback-thanks {
		margin-top: 8px;
		font-size: 0.85rem;
		color: var(--acc);
	}

	.feedback-error {
		margin: 0;
		font-size: 0.8rem;
		color: #e05;
	}
</style>
