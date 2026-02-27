<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PROJECT_NAME } from '$lib/config';

	const WORKER_URL = 'https://blacktape-signups.theaterofdelays.workers.dev/claim';

	let artistName = $state('');
	let artistReadOnly = $state(false);
	let fromSlug = $state('');
	let email = $state('');
	let message = $state('');
	let submitted = $state(false);
	let loading = $state(false);
	let error = $state('');

	onMount(() => {
		const artistParam = $page.url.searchParams.get('artist') ?? '';
		if (artistParam) {
			artistName = artistParam;
			artistReadOnly = true;
		}
		fromSlug = $page.url.searchParams.get('from') ?? '';
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';

		if (!artistName.trim()) {
			error = 'Please enter the artist name.';
			return;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			error = 'Please enter a valid email address.';
			return;
		}
		if (!message.trim()) {
			error = 'Please tell us how we can verify this is you.';
			return;
		}

		loading = true;
		try {
			const res = await fetch(WORKER_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ artistName, email, message })
			});
			if (res.ok) {
				submitted = true;
			} else {
				error = 'Something went wrong. Please try again or email us directly.';
			}
		} catch {
			error = 'Could not reach the server. Check your connection and try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Claim your page — {PROJECT_NAME}</title>
</svelte:head>

{#if !submitted}
	<div class="claim-page">
		<h1 class="claim-heading">Claim your artist page</h1>
		<p class="claim-intro">
			If this is your page, you can claim it. Once claimed, we'll be in touch to connect your
			profile, add links, and help your music reach the right people.
		</p>

		<form onsubmit={handleSubmit} class="claim-form">
			<div class="claim-field">
				<label for="claim-artist" class="claim-label">Artist name</label>
				<input
					id="claim-artist"
					type="text"
					class="claim-input"
					class:claim-input--readonly={artistReadOnly}
					bind:value={artistName}
					readonly={artistReadOnly}
					required
				/>
			</div>

			<div class="claim-field">
				<label for="claim-email" class="claim-label">Your email</label>
				<input
					id="claim-email"
					type="email"
					class="claim-input"
					bind:value={email}
					required
				/>
			</div>

			<div class="claim-field">
				<label for="claim-message" class="claim-label">How should we verify this is you?</label>
				<textarea
					id="claim-message"
					class="claim-textarea"
					bind:value={message}
					placeholder="Link your website, Bandcamp, social profiles, or any proof you're this artist"
					rows="4"
					required
				></textarea>
			</div>

			{#if error}
				<p class="claim-error">{error}</p>
			{/if}

			<button type="submit" class="claim-submit" disabled={loading}>
				{loading ? 'Sending...' : 'Submit claim'}
			</button>
		</form>
	</div>
{/if}

{#if submitted}
	<div class="claim-page">
		<div class="claim-confirmation">
			<h1 class="claim-heading">Thanks — we'll be in touch.</h1>
			<p class="claim-intro">
				Your claim for <strong>{artistName}</strong> has been received. We'll review it and reach
				out to you at <strong>{email}</strong>.
			</p>
			{#if fromSlug}
				<a href="/artist/{fromSlug}" class="claim-back-link">Back to {artistName}'s page</a>
			{:else}
				<a href="/search?q={encodeURIComponent(artistName)}" class="claim-back-link"
					>Search for {artistName}</a
				>
			{/if}
		</div>
	</div>
{/if}

<style>
	.claim-page {
		max-width: 480px;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	.claim-heading {
		font-size: 1.25rem;
		font-weight: 400;
		margin: 0 0 0.75rem;
		color: var(--t-1);
	}

	.claim-intro {
		font-size: 0.875rem;
		color: var(--t-2);
		margin: 0 0 1.5rem;
		line-height: 1.5;
	}

	.claim-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.claim-field {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.claim-label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		color: var(--t-2);
	}

	.claim-input,
	.claim-textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: var(--bg-2);
		border: 1px solid var(--b-1);
		border-radius: 0;
		color: var(--t-1);
		font-size: 0.875rem;
		box-sizing: border-box;
		font-family: inherit;
	}

	.claim-textarea {
		resize: vertical;
	}

	.claim-input--readonly {
		opacity: 0.7;
		cursor: default;
	}

	.claim-error {
		color: #e55;
		font-size: 0.8125rem;
		margin-top: 0.25rem;
		margin-bottom: 0;
	}

	.claim-submit {
		margin-top: 0.25rem;
		padding: 0.5rem 1.25rem;
		background: var(--acc);
		color: #fff;
		border: none;
		border-radius: 0;
		cursor: pointer;
		font-size: 0.875rem;
		align-self: flex-start;
	}

	.claim-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.claim-confirmation {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.claim-back-link {
		font-size: 0.875rem;
		color: var(--acc);
		text-decoration: underline;
	}
</style>
