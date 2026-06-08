import { Hono } from 'hono';
import { explainSimply } from '../lib/rag/explain';

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

  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    return c.json({ error: 'text must be a non-empty string.' }, 400);
  }

  if (payload.title !== undefined && typeof payload.title !== 'string') {
    return c.json({ error: 'title must be a string when provided.' }, 400);
  }

  const title = typeof payload.title === 'string' ? payload.title : undefined;

  try {
    const result = await explainSimply(payload.text, title);

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        error: 'Simple explanation is unavailable.',
        message,
      },
      503,
    );
  }
});

export default route;
