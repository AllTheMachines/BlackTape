import adapterStatic from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapterStatic({ fallback: 'index.html' })
	}
};

export default config;
