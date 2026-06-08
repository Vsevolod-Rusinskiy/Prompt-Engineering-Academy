import { Hono } from 'hono';
import { checkOllamaHealth } from '../lib/ollama';

const route = new Hono();

route.get('/', async (c) => {
  const result = await checkOllamaHealth();
  return c.json(result, result.status === 'ok' ? 200 : 503);
});

export default route;
