import { Hono } from 'hono';
import { askPlatform } from '../lib/rag/ask';

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

  try {
    const result = await askPlatform(payload.query);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        error: 'RAG answer is unavailable.',
        message,
      },
      503,
    );
  }
});

export default route;
