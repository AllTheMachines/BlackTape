<script lang="ts">
	interface Props {
		href: string;
		label?: string;
	}

	let { href, label = 'RSS Feed' }: Props = $props();
</script>

<a {href} class="rss-btn" aria-label={label} title={label} target="_blank" rel="noopener noreferrer">
	<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<circle cx="6.18" cy="17.82" r="2.18"/>
		<path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/>
	</svg>
</a>

<style>
	.rss-btn {
		display: inline-flex;
		align-items: center;
		color: #f26522;
		opacity: 0.8;
		text-decoration: none;
		flex-shrink: 0;
	}

	.rss-btn:hover {
		opacity: 1;
		text-decoration: none;
	}
</style>
