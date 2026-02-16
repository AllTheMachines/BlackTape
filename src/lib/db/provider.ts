/**
 * Database provider interface — the abstraction layer between Mercury's
 * query functions and the underlying database engine.
 *
 * Two implementations exist:
 * - D1Provider  — wraps Cloudflare D1 for the web build
 * - TauriProvider — wraps @tauri-apps/plugin-sql for the desktop build
 *
 * Query functions in queries.ts accept DbProvider, never D1Database directly.
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface DbProvider {
	/** Execute a query and return all matching rows. */
	all<T>(sql: string, ...params: unknown[]): Promise<T[]>;

	/** Execute a query and return the first matching row, or null. */
	get<T>(sql: string, ...params: unknown[]): Promise<T | null>;
}

// ---------------------------------------------------------------------------
// Factory (used by Tauri desktop builds; web builds create D1Provider directly)
// ---------------------------------------------------------------------------

/**
 * Detect the runtime platform and return the appropriate DbProvider.
 *
 * - In a Tauri context this returns a TauriProvider backed by local SQLite.
 * - In a web/server context this throws — D1Provider must be created explicitly
 *   from `platform.env.DB` inside SvelteKit server routes.
 */
export async function getProvider(): Promise<DbProvider> {
	try {
		// Dynamic import so this never breaks the web build
		// @ts-expect-error — @tauri-apps/api is installed in Phase 3 Plan 02
		const { isTauri } = await import('@tauri-apps/api/core');
		if (isTauri()) {
			const { TauriProvider } = await import('./tauri-provider');
			return TauriProvider.getInstance();
		}
	} catch {
		// @tauri-apps/api not installed — we're in the web build
	}

	throw new Error(
		'getProvider() cannot be used in the web build. ' +
			'Create a D1Provider from platform.env.DB in your server route instead.'
	);
}
