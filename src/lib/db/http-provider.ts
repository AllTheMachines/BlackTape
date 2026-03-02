/**
 * HttpProvider — implements DbProvider by POSTing SQL queries to the
 * Mercury API (Cloudflare Worker + D1).
 *
 * Drop-in replacement for TauriProvider. All 50+ query functions in
 * queries.ts work unchanged — they only see the DbProvider interface.
 */

import type { DbProvider } from './provider';

export class HttpProvider implements DbProvider {
	constructor(private baseUrl: string) {}

	async all<T>(sql: string, ...params: unknown[]): Promise<T[]> {
		const res = await fetch(`${this.baseUrl}/query`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ sql, params }),
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`API error ${res.status}: ${text}`);
		}
		const data: { results: T[] } = await res.json();
		return data.results;
	}

	async get<T>(sql: string, ...params: unknown[]): Promise<T | null> {
		const results = await this.all<T>(sql, ...params);
		return results[0] ?? null;
	}
}
