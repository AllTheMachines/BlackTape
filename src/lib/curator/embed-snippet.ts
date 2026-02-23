/**
 * Generates iframe and script-tag embed snippets for Mercury artist/collection embeds.
 * Used on artist page and collection page to give bloggers copy-paste code.
 *
 * When `curatorHandle` is provided (script-tag mode only), the snippet includes
 * a `data-curator` attribute. embed.js reads this attribute on the blogger's site
 * and fires a GET to /api/curator-feature?slug=[slug]&curator=[handle] to record attribution.
 */

export interface EmbedSnippets {
	iframe: string;
	scriptTag: string;
}

export function generateEmbedSnippets(
	embedUrl: string,
	title: string,
	curatorHandle?: string
): EmbedSnippets {
	const escaped = title.replace(/"/g, '&quot;');

	// data-curator attribute — included in script-tag snippet only when handle is provided
	const curatorAttr = curatorHandle
		? `\n  data-curator="${curatorHandle.replace(/"/g, '&quot;')}"`
		: '';

	const iframe = `<iframe
  src="${embedUrl}"
  width="400"
  height="180"
  title="${escaped}"
  frameborder="0"
  style="border-radius:8px;overflow:hidden;max-width:100%;"
  loading="lazy"
></iframe>`;

	const scriptTag = `<div id="mercury-embed"
  data-src="${embedUrl}"
  data-title="${escaped}"${curatorAttr}
></div>
<script src="${embedUrl.split('/embed/')[0]}/embed.js" async><\/script>`;

	return { iframe, scriptTag };
}
