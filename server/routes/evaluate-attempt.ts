import { Hono } from 'hono';
import { ZodError } from 'zod';
import type { EvaluateAttemptRequest } from '../../src/lib/journey';
import { evaluateAttempt } from '../lib/ai';
import { evaluateAttemptRequestSchema } from '../lib/schemas';

const route = new Hono();

route.post('/', async (c) => {
  try {
    const payload = evaluateAttemptRequestSchema.parse(
      await c.req.json(),
    ) as EvaluateAttemptRequest;
    const evaluation = await evaluateAttempt(payload);
    return c.json({ evaluation });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Invalid attempt evaluation payload',
          details: error.flatten(),
        },
        400,
      );
    }

    return c.json({ error: 'Failed to evaluate attempt' }, 500);
  }
});

export default route;
