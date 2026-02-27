/**
 * YouTube URL to embed URL transformer.
 *
 * Converts video URLs to privacy-friendly nocookie embed URLs.
 * Channel URLs cannot be embedded — detected separately for external link fallback.
 */

const VIDEO_PATTERNS = [
	/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
	/youtu\.be\/([a-zA-Z0-9_-]{11})/,
	/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
];

const CHANNEL_PATTERN = /youtube\.com\/(channel|c|user|@)/;

/**
 * Convert a YouTube video URL to a privacy-friendly embed URL.
 *
 * @param url - A YouTube URL
 * @returns Nocookie embed URL for videos, or null for channels/non-video URLs
 */
export function youtubeEmbedUrl(url: string): string | null {
	for (const pattern of VIDEO_PATTERNS) {
		const match = url.match(pattern);
		if (match) {
			return `https://www.youtube-nocookie.com/embed/${match[1]}?enablejsapi=1`;
		}
	}
	return null;
}

/**
 * Detect whether a YouTube URL is a channel/user page (not embeddable).
 */
export function isYoutubeChannel(url: string): boolean {
	return CHANNEL_PATTERN.test(url);
}
