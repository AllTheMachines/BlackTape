import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterStatic from '@sveltejs/adapter-static';

const isDesktop = process.env.TAURI_ENV === '1';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: isDesktop
			? adapterStatic({ fallback: 'index.html' })
			: adapterCloudflare({
					routes: {
						include: ['/*'],
						exclude: ['<all>']
					}
				})
	}
};

export default config;
