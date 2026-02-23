<script lang="ts">
	let { children } = $props();
</script>

<svelte:head>
	<meta name="color-scheme" content="light dark" />
</svelte:head>

{@render children()}

<style>
	:global(html) {
		margin: 0;
		padding: 0;
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 14px;
	}
	:global(body) {
		margin: 0;
		background: transparent;
	}
</style>
