import { Hono } from 'hono';
import { MAX_RAG_TOP_K, searchArticleChunks } from '../lib/rag/search';

const route = new Hono();

route.post('/', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Request body must be an object.' }, 400);
  }

  const payload = body as Record<string, unknown>;

  if (typeof payload.query !== 'string' || !payload.query.trim()) {
    return c.json({ error: 'query must be a non-empty string.' }, 400);
  }

  if (
    payload.topK !== undefined &&
    (typeof payload.topK !== 'number' ||
      !Number.isInteger(payload.topK) ||
      payload.topK < 1 ||
      payload.topK > MAX_RAG_TOP_K)
  ) {
    return c.json({ error: `topK must be an integer from 1 to ${MAX_RAG_TOP_K}.` }, 400);
  }

  try {
    const result = await searchArticleChunks(
      payload.query,
      payload.topK as number | undefined,
    );

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        error: 'Semantic search is unavailable.',
        message,
      },
      503,
    );
  }
});

export default route;
