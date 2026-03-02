/**
 * Mercury API — Cloudflare Worker that proxies SQL queries to D1.
 *
 * Endpoints:
 *   GET  /health       — simple ping
 *   POST /query        — execute SQL against D1, return rows
 *   POST /match-batch  — match artist names to MBIDs (replaces Rust match_artists_batch)
 */

interface Env {
	DB: D1Database;
}

// CORS headers — read-only public data (CC0), allow all origins
const CORS_HEADERS: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
	});
}

function error(message: string, status = 400): Response {
	return json({ error: message }, status);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		const url = new URL(request.url);
		const path = url.pathname;

		try {
			if (path === '/health' && request.method === 'GET') {
				return handleHealth(env);
			}

			if (path === '/query' && request.method === 'POST') {
				return handleQuery(request, env);
			}

			if (path === '/match-batch' && request.method === 'POST') {
				return handleMatchBatch(request, env);
			}

			return error('Not found', 404);
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Internal server error';
			return error(message, 500);
		}
	},
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------

async function handleHealth(env: Env): Promise<Response> {
	const result = await env.DB.prepare('SELECT COUNT(*) as count FROM artists').first<{ count: number }>();
	return json({ status: 'ok', artists: result?.count ?? 0 });
}

// ---------------------------------------------------------------------------
// POST /query — generic SQL passthrough
// ---------------------------------------------------------------------------

interface QueryBody {
	sql: string;
	params?: unknown[];
}

// SQL safety: only allow read-only statements
const ALLOWED_PREFIXES = ['SELECT', 'WITH'];

function isReadOnly(sql: string): boolean {
	const trimmed = sql.trimStart().toUpperCase();
	return ALLOWED_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

async function handleQuery(request: Request, env: Env): Promise<Response> {
	const body = await request.json<QueryBody>();

	if (!body.sql || typeof body.sql !== 'string') {
		return error('Missing or invalid "sql" field');
	}

	if (!isReadOnly(body.sql)) {
		return error('Only SELECT / WITH queries are allowed', 403);
	}

	const params = body.params ?? [];
	const stmt = env.DB.prepare(body.sql).bind(...params);
	const { results } = await stmt.all();

	return json({ results });
}

// ---------------------------------------------------------------------------
// POST /match-batch — batch artist name matching
// ---------------------------------------------------------------------------

interface MatchBatchBody {
	names: string[];
}

interface MatchResult {
	name: string;
	artist_mbid: string | null;
	artist_slug: string | null;
}

async function handleMatchBatch(request: Request, env: Env): Promise<Response> {
	const body = await request.json<MatchBatchBody>();

	if (!Array.isArray(body.names)) {
		return error('Missing or invalid "names" array');
	}

	// Cap at 500 names per request to avoid timeout
	const names = body.names.slice(0, 500);
	const results: MatchResult[] = [];

	// Batch in groups of 50 to stay within D1 limits
	const BATCH_SIZE = 50;
	for (let i = 0; i < names.length; i += BATCH_SIZE) {
		const batch = names.slice(i, i + BATCH_SIZE);
		const stmts = batch.map((name) =>
			env.DB.prepare('SELECT mbid, slug FROM artists WHERE LOWER(name) = LOWER(?) LIMIT 1').bind(name)
		);

		const batchResults = await env.DB.batch<{ mbid: string; slug: string }>(stmts);

		for (let j = 0; j < batch.length; j++) {
			const rows = batchResults[j].results;
			if (rows.length > 0) {
				results.push({
					name: batch[j],
					artist_mbid: rows[0].mbid,
					artist_slug: rows[0].slug,
				});
			} else {
				results.push({
					name: batch[j],
					artist_mbid: null,
					artist_slug: null,
				});
			}
		}
	}

	return json(results);
}
