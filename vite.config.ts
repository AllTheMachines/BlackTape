/// <reference types="node" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const isDesktop = process.env.TAURI_ENV === '1';

export default defineConfig({
	plugins: [sveltekit()],
	...(isDesktop
		? {
				build: {
					assetsInlineLimit: 0
				}
			}
		: {})
});
