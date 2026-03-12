export interface Env {
  DB: D1Database;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Sanitize user input for FTS5 prefix MATCH query.
 * Uses a whitelist approach: only keep letters, numbers, underscores, and whitespace.
 * Also strips FTS5 keyword operators (AND, OR, NOT, NEAR) to prevent syntax errors.
 */
function sanitizeFtsQuery(raw: string): string {
  // Keep only Unicode letters, numbers, underscores, and whitespace
  let cleaned = raw.replace(/[^\p{L}\p{N}_\s]/gu, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Remove FTS5 keyword operators (case-sensitive, standalone words only)
  cleaned = cleaned.replace(/\b(AND|OR|NOT|NEAR)\b/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      const result = await env.DB.prepare('SELECT 1 as test').first();
      return new Response(
        JSON.stringify({ message: 'Hello from Worker', dbTest: result }),
        { headers: JSON_HEADERS }
      );
    }

    if (url.pathname === '/search') {
      const query = url.searchParams.get('q');
      const limit = Math.min(
        Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1),
        50
      );

      if (!query || query.trim().length < 2) {
        return new Response(
          JSON.stringify({ error: 'Query must be at least 2 characters' }),
          { status: 400, headers: JSON_HEADERS }
        );
      }

      const sanitized = sanitizeFtsQuery(query);

      if (sanitized.length < 2) {
        return new Response(
          JSON.stringify({ results: [], query: query.trim(), count: 0 }),
          { headers: JSON_HEADERS }
        );
      }

      try {
        const results = await env.DB.prepare(
          `SELECT a.id, a.title, a.artist_name, a.release_group_mbid, a.listen_count, a.release_type
           FROM albums_fts
           JOIN albums a ON a.id = albums_fts.rowid
           WHERE albums_fts MATCH ?
           ORDER BY
             CASE
               WHEN LOWER(a.artist_name) = LOWER(?) THEN 0
               WHEN LOWER(a.title) LIKE LOWER(?) || '%' THEN 1
               WHEN LOWER(a.artist_name) LIKE LOWER(?) || '%' THEN 2
               ELSE 3
             END,
             COALESCE(a.listen_count, 0) DESC,
             a.canonical_score DESC
           LIMIT ?`
        )
          .bind(`${sanitized}*`, sanitized, sanitized, sanitized, limit)
          .all();

        return new Response(
          JSON.stringify({
            results: results.results,
            query: sanitized,
            count: results.results.length,
          }),
          { headers: JSON_HEADERS }
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('D1 query failed:', { query: sanitized, error: message });
        return new Response(
          JSON.stringify({
            error: 'Search query failed',
            detail: message,
            query: sanitized,
          }),
          { status: 500, headers: JSON_HEADERS }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  },
};
