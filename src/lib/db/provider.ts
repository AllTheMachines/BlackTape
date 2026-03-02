/**
 * Database provider interface — the abstraction layer between Mercury's
 * query functions and the underlying database engine.
 *
 * Two implementations exist:
 * - HttpProvider  — POSTs queries to the Mercury API (Cloudflare Worker + D1)
 * - TauriProvider — wraps rusqlite for the desktop build (legacy, unused)
 *
 * Query functions in queries.ts accept DbProvider, never a database directly.
 */

import { API_BASE_URL } from '$lib/config';

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
// Factory
// ---------------------------------------------------------------------------

/**
 * Return the HttpProvider backed by the Mercury API.
 * Works identically in Tauri desktop and future web builds.
 */
export async function getProvider(): Promise<DbProvider> {
	const { HttpProvider } = await import('./http-provider');
	return new HttpProvider(API_BASE_URL);
}
