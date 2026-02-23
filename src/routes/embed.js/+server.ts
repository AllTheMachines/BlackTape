/**
 * GET /embed.js — Script-tag embed bootstrap.
 *
 * Serves a small JavaScript snippet that bloggers include via <script src="/embed.js" async>.
 * When loaded on an external site, the script:
 *   1. Finds the <div id="mercury-embed" data-src="..." data-title="..."> div
 *   2. Injects an iframe using the data-src embed URL
 *   3. If data-curator is present, fires an attribution ping to /api/curator-feature
 *
 * CORS: Access-Control-Allow-Origin: * required — this script is loaded from external domains.
 * Cache: 24hr browser cache is appropriate — the script logic rarely changes.
 */

export function GET(): Response {
	const js = `(function() {
  var div = document.getElementById('mercury-embed');
  if (!div) return;
  var src = div.getAttribute('data-src');
  var title = div.getAttribute('data-title') || 'Mercury artist';
  var curator = div.getAttribute('data-curator');
  if (!src) return;
  // Inject iframe replacing the div
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.width = '400';
  iframe.height = '200';
  iframe.title = title;
  iframe.frameBorder = '0';
  iframe.loading = 'lazy';
  iframe.style.cssText = 'border-radius:8px;overflow:hidden;max-width:100%;display:block;';
  if (div.parentNode) {
    div.parentNode.replaceChild(iframe, div);
  }
  // Fire attribution ping if curator handle provided
  if (curator) {
    try {
      var parts = src.split('/embed/artist/');
      if (parts.length === 2) {
        var origin = parts[0];
        var slug = parts[1].split('?')[0].split('/')[0];
        var ping = origin + '/api/curator-feature?slug=' + encodeURIComponent(slug) + '&curator=' + encodeURIComponent(curator);
        fetch(ping, { mode: 'no-cors' }).catch(function() {});
      }
    } catch(e) {}
  }
})();`;

	return new Response(js, {
		headers: {
			'Content-Type': 'text/javascript; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
			'Access-Control-Allow-Origin': '*',
		},
	});
}
