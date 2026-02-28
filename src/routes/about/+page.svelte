<script lang="ts">
	import { PROJECT_NAME, PROJECT_TAGLINE } from '$lib/config';

	const WORKER_URL = 'https://blacktape-signups.theaterofdelays.workers.dev/feedback';

	let feedbackType = $state('bug');
	let feedbackTitle = $state('');
	let feedbackBody = $state('');
	let feedbackEmail = $state('');
	let feedbackSent = $state(false);
	let feedbackError = $state('');
	let feedbackSending = $state(false);

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
	<div class="about-header">
		<h1>About {PROJECT_NAME}</h1>
		<p class="tagline">{PROJECT_TAGLINE}</p>
	</div>

	<section class="about-section">
		<h2>What {PROJECT_NAME} is</h2>
		<p>A music search engine with taste. {PROJECT_NAME} indexes artists from open databases, embeds players from wherever music already lives, and lets you discover through atomic tags. The more niche you are, the more discoverable you become.</p>
	</section>

	<section class="about-section">
		<h2>How it works</h2>
		<p>Search by artist name or tag. Intersect tags to drill into specificity. Click into genres to explore scenes, movements, and their connections. Niche artists surface first — generic artists sink. Discovery rewards depth.</p>
	</section>

	<section class="about-section">
		<h2>Why it exists</h2>
		<p>Streaming algorithms optimize for engagement, not discovery. The underground is invisible. {PROJECT_NAME} is built on the premise that the most interesting music is the least played, and a good discovery engine should surface it — not bury it.</p>
	</section>

	<section class="about-section">
		<h2>Mission</h2>
		<p>No tracking. No ads. No algorithmic manipulation. No audio hosting. A pure discovery tool — open source, public good, free forever. The community decides what happens next.</p>
	</section>

	<section class="about-section">
		<h2>Data sources</h2>
		<p>Artist data comes from <a href="https://musicbrainz.org" target="_blank" rel="noopener">MusicBrainz</a> (2.6M+ artists, CC0 public domain) and genre/scene data from <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>. Release data fetched live from the MusicBrainz API. No proprietary data, no locked-in sources.</p>
	</section>

	<section id="support" class="about-section about-support-section">
		<h2>Support</h2>
		<p>BlackTape runs on no ads, no tracking, no VC money — just people who care about music.</p>
		<div class="support-links-row">
			<!-- TODO: Replace placeholder URLs with real account URLs when Mercury's accounts are created -->
			<a href="https://ko-fi.com/mercury" target="_blank" rel="noopener noreferrer" class="support-link-item">Ko-fi</a>
			<a href="https://github.com/sponsors/mercury" target="_blank" rel="noopener noreferrer" class="support-link-item">GitHub Sponsors</a>
			<a href="https://opencollective.com/mercury" target="_blank" rel="noopener noreferrer" class="support-link-item">Open Collective</a>
		</div>
		<!-- backers link hidden until Nostr backer feed is active in v2 -->
	</section>

	<section class="about-section">
		<h2>Feedback</h2>
		<p>Found a bug? Have a suggestion? All feedback is read and appreciated.</p>
		{#if feedbackSent}
			<p class="feedback-thanks">Thanks — your email client should have opened. Send whenever you're ready.</p>
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
					placeholder="Title"
					bind:value={feedbackTitle}
					class="feedback-input"
					maxlength="120"
				/>
				<textarea
					placeholder="Describe the issue or idea..."
					bind:value={feedbackBody}
					class="feedback-textarea"
					rows="4"
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
		<a href="https://github.com/AllTheMachines/Mercury" target="_blank" rel="noopener" class="cta-secondary">GitHub</a>
	</div>
</div>

<style>
	.about-page {
		padding: 20px;
	}

	.about-header {
		margin-bottom: var(--space-xl, 2rem);
	}

	.about-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--t-1);
		margin: 0 0 var(--space-xs, 0.25rem) 0;
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
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--t-2);
		margin: 0 0 var(--space-sm, 0.5rem) 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.about-section p {
		font-size: 0.9rem;
		color: var(--t-3);
		line-height: 1.7;
		margin: 0;
	}

	.about-section a {
		color: var(--acc);
		text-decoration: none;
	}

	.about-section a:hover {
		text-decoration: underline;
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

	.cta-secondary {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		padding: var(--space-sm, 0.5rem) var(--space-md, 1rem);
		border: 1px solid var(--b-1);
		border-radius: 0;
		transition: color 0.15s, border-color 0.15s;
	}

	.cta-secondary:hover {
		color: var(--t-2);
		border-color: var(--t-3);
	}

	.support-links-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm, 0.5rem);
		margin-top: var(--space-sm, 0.5rem);
		margin-bottom: var(--space-sm, 0.5rem);
	}

	.support-link-item {
		font-size: 0.85rem;
		color: var(--acc);
		text-decoration: none;
		padding: 0.25rem 0.6rem;
		border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
		border-radius: 0;
		transition: background 0.15s, color 0.15s;
	}

	.support-link-item:hover {
		background: color-mix(in srgb, var(--acc) 15%, transparent);
	}

	.view-backers-link {
		font-size: 0.85rem;
		color: var(--t-3);
		text-decoration: none;
		display: inline-block;
		margin-top: var(--space-xs, 0.25rem);
	}

	.view-backers-link:hover {
		color: var(--t-2);
		text-decoration: underline;
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
