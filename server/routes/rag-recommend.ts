import { Hono } from 'hono';
import { recommendNext } from '../lib/rag/recommend';

const route = new Hono();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

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

  if (
    !isStringArray(payload.weakTopics) ||
    !isStringArray(payload.strongTopics) ||
    !isStringArray(payload.recentQueries)
  ) {
    return c.json(
      { error: 'weakTopics, strongTopics and recentQueries must be string arrays.' },
      400,
    );
  }

  try {
    const result = await recommendNext({
      weakTopics: payload.weakTopics,
      strongTopics: payload.strongTopics,
      recentQueries: payload.recentQueries,
    });

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        error: 'Study recommendation is unavailable.',
        message,
      },
      503,
    );
  }
});

export default route;
