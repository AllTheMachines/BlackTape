import { goto } from '$app/navigation';
import { HELP_BASE_URL } from '$lib/config';

/** Maps app route prefixes to help topic slugs. */
const ROUTE_TOPICS: [string, string][] = [
	['/artist/', 'artist-page'],
	['/kb/', 'knowledge-base'],
	['/room/', 'listening-rooms'],
	['/discover', 'discover'],
	['/style-map', 'style-map'],
	['/kb', 'knowledge-base'],
	['/time-machine', 'time-machine'],
	['/crate', 'crate-dig'],
	['/library', 'library'],
	['/explore', 'discover'],
	['/new-rising', 'new-rising'],
	['/scenes', 'scenes'],
	['/profile', 'profile'],
	['/settings', 'settings'],
	['/about', 'about'],
	['/search', 'search'],
	['/', 'search'],
];

export function helpTopicForPath(pathname: string): string {
	for (const [prefix, topic] of ROUTE_TOPICS) {
		if (pathname.startsWith(prefix)) return topic;
	}
	return 'search';
}

/** Open help for a topic. Uses in-app navigation for relative HELP_BASE_URL, shell.open() for https://. */
export async function openHelp(topic: string): Promise<void> {
	const url = `${HELP_BASE_URL}/${topic}`;
	if (url.startsWith('http')) {
		const { open } = await import('@tauri-apps/plugin-shell');
		await open(url);
	} else {
		await goto(url);
	}
}
