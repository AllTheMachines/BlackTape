// Desktop builds (TAURI_ENV=1) disable SSR so adapter-static works as SPA.
// Web builds leave SSR enabled (default) for Cloudflare server-side rendering.
//
// VITE_TAURI is set in tauri.conf.json's beforeBuildCommand and in the
// tauri:dev npm script. Vite replaces import.meta.env at compile time,
// so this evaluates to a static boolean in the final bundle.

export const ssr = import.meta.env.VITE_TAURI !== '1';
export const prerender = false;
