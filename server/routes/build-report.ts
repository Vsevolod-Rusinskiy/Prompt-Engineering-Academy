import { Hono } from 'hono';
import { ZodError } from 'zod';
import { buildReport } from '../lib/ai';
import { buildReportRequestSchema } from '../lib/schemas';

const route = new Hono();

route.post('/', async (c) => {
  try {
    const payload = buildReportRequestSchema.parse(await c.req.json());
    const report = await buildReport(payload);
    return c.json({ report });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Invalid report payload',
          details: error.flatten(),
        },
        400,
      );
    }

    return c.json({ error: 'Failed to build report' }, 500);
  }
});

export default route;
