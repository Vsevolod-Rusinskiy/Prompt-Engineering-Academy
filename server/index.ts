import 'dotenv/config';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getOpenAIModel, isOpenAIConfigured } from './lib/openai';
import buildReportRoute from './routes/build-report';
import evaluateAttemptRoute from './routes/evaluate-attempt';
import generateJourneyRoute from './routes/generate-journey';

const app = new Hono();
const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? '127.0.0.1';

app.use('*', logger());
app.use('/api/*', cors());

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'knowledge-journey-server',
    ai: {
      provider: isOpenAIConfigured() ? 'openai' : 'mock',
      model: isOpenAIConfigured() ? getOpenAIModel() : null,
    },
  });
});

app.route('/api/journey/generate', generateJourneyRoute);
app.route('/api/attempt/evaluate', evaluateAttemptRoute);
app.route('/api/report/build', buildReportRoute);

serve(
  {
    fetch: app.fetch,
    port,
    hostname,
  },
  (info) => {
    console.log(`Knowledge Journey server is running on http://${hostname}:${info.port}`);
  },
);
