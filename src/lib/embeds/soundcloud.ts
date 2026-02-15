/**
 * SoundCloud oEmbed URL construction.
 *
 * The actual oEmbed fetch happens server-side in the artist page
 * load function — this utility only constructs the API URL.
 */

const SOUNDCLOUD_ARTIST_PATTERN = /soundcloud\.com\/([a-zA-Z0-9_-]+)\/?$/;

/**
 * Construct the SoundCloud oEmbed API URL for a given SoundCloud page URL.
 *
 * @param url - A SoundCloud URL (track, playlist, or artist page)
 * @returns The oEmbed API URL to fetch embed HTML from
 */
export function soundcloudOembedUrl(url: string): string {
	return `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json&maxheight=166`;
}

/**
 * Detect whether a SoundCloud URL is an artist/profile page (vs a track/playlist).
 *
 * Artist pages have a single path segment after soundcloud.com.
 * Track pages have two segments (e.g. /artist/track-name).
 */
export function isSoundcloudArtist(url: string): boolean {
	return SOUNDCLOUD_ARTIST_PATTERN.test(url);
}
