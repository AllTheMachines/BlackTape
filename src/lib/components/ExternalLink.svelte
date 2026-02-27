<script lang="ts">
	import type { PlatformType } from '$lib/embeds/types';

	let {
		url,
		platform,
		label
	}: {
		url: string;
		platform: PlatformType | 'other';
		label?: string;
	} = $props();

	const platformLabels: Record<PlatformType | 'other', string> = {
		bandcamp: 'Listen on Bandcamp',
		spotify: 'Listen on Spotify',
		soundcloud: 'Listen on SoundCloud',
		youtube: 'Visit on YouTube',
		other: 'Visit'
	};

	let displayLabel = $derived(label ?? platformLabels[platform] ?? 'Visit');
</script>

<a
	href={url}
	target="_blank"
	rel="noopener noreferrer"
	class="external-link platform-{platform}"
>
	{displayLabel}
</a>

<style>
	.external-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-md);
		background: var(--bg-elevated);
		border: 1px solid var(--border-default);
		border-radius: 0;
		font-size: 0.85rem;
		color: var(--text-primary);
		text-decoration: none;
		transition:
			background 0.15s,
			border-color 0.15s;
		white-space: nowrap;
	}

	.external-link:hover {
		background: var(--bg-hover);
		border-color: var(--border-hover);
		text-decoration: none;
	}

	.platform-bandcamp {
		border-color: color-mix(in srgb, var(--bandcamp-color) 40%, transparent);
		color: var(--bandcamp-color);
	}
	.platform-bandcamp:hover {
		border-color: var(--bandcamp-color);
	}

	.platform-spotify {
		border-color: color-mix(in srgb, var(--spotify-color) 40%, transparent);
		color: var(--spotify-color);
	}
	.platform-spotify:hover {
		border-color: var(--spotify-color);
	}

	.platform-soundcloud {
		border-color: color-mix(in srgb, var(--soundcloud-color) 40%, transparent);
		color: var(--soundcloud-color);
	}
	.platform-soundcloud:hover {
		border-color: var(--soundcloud-color);
	}

	.platform-youtube {
		border-color: color-mix(in srgb, var(--youtube-color) 40%, transparent);
		color: var(--youtube-color);
	}
	.platform-youtube:hover {
		border-color: var(--youtube-color);
	}

	.platform-other {
		color: var(--link-color);
	}
</style>
