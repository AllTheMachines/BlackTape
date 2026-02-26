<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	let isDark = $state(false);

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		isDark = mq.matches;
		mq.addEventListener('change', (e) => {
			isDark = e.matches;
		});
	});
</script>

<div class="card" class:dark={isDark}>
	<p class="icon">&#9776;</p>
	<div class="message">
		<p class="title">Collection</p>
		<p class="body">This collection requires the BlackTape desktop app.</p>
		<a
			href="/"
			target="_blank"
			rel="noopener"
			class="cta"
		>
			Get BlackTape →
		</a>
	</div>
</div>

<style>
	.card {
		--card-bg: #ffffff;
		--card-text: #111111;
		--card-text-muted: #555555;
		--card-border: #e0e0e0;
		--link-color: #1a73e8;

		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;
		width: 300px;
		min-height: 120px;
		background: var(--card-bg);
		color: var(--card-text);
		border: 1px solid var(--card-border);
		border-radius: 8px;
		padding: 14px;
		box-sizing: border-box;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.card.dark {
		--card-bg: #1a1a1a;
		--card-text: #f0f0f0;
		--card-text-muted: #aaaaaa;
		--card-border: #333333;
		--link-color: #7ab4f5;
	}

	.icon {
		font-size: 1.8rem;
		color: var(--card-text-muted);
		margin: 0;
		flex-shrink: 0;
		opacity: 0.5;
	}

	.message {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.title {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--card-text);
		margin: 0;
	}

	.body {
		font-size: 12px;
		color: var(--card-text-muted);
		margin: 0;
		line-height: 1.4;
	}

	.cta {
		display: inline-block;
		margin-top: 6px;
		font-size: 12px;
		color: var(--link-color);
		text-decoration: none;
		font-weight: 500;
	}

	.cta:hover {
		text-decoration: underline;
	}
</style>
