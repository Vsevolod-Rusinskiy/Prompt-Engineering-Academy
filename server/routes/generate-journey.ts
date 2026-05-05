import { Hono } from 'hono';
import { ZodError } from 'zod';
import { generateJourney } from '../lib/ai';
import { generateJourneyRequestSchema } from '../lib/schemas';

const route = new Hono();

route.post('/', async (c) => {
  try {
    const payload = generateJourneyRequestSchema.parse(await c.req.json());
    const journey = await generateJourney(payload);
    return c.json({ journey });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Invalid journey generation payload',
          details: error.flatten(),
        },
        400,
      );
    }

    return c.json({ error: 'Failed to generate journey' }, 500);
  }
});

export default route;
