<script lang="ts">
	import { page } from '$app/stores';
	import { helpTopicForPath, openHelp } from '$lib/help';

	interface Props {
		topic?: string; // override auto-detection
	}

	let { topic }: Props = $props();

	let resolvedTopic = $derived(topic ?? helpTopicForPath($page.url.pathname));
</script>

<button
	class="help-btn"
	onclick={() => openHelp(resolvedTopic)}
	title="Help for this page"
	aria-label="Open help"
>?</button>

<style>
	.help-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: none;
		border: 1px solid var(--b-2);
		border-radius: 50%;
		color: var(--t-3);
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		line-height: 1;
		transition: border-color 0.15s, color 0.15s;
		flex-shrink: 0;
	}

	.help-btn:hover {
		border-color: var(--acc);
		color: var(--acc);
	}

	.help-btn:active {
		opacity: 0.7;
	}
</style>
