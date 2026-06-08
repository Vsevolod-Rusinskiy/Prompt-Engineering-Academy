import 'dotenv/config';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { getOpenAIModel, isOpenAIConfigured } from './lib/openai';
import buildReportRoute from './routes/build-report';
import evaluateAttemptRoute from './routes/evaluate-attempt';
import generateJourneyRoute from './routes/generate-journey';
import ollamaHealthRoute from './routes/ollama-health';
import ragAskRoute from './routes/rag-ask';
import ragExplainRoute from './routes/rag-explain';
import ragRecommendRoute from './routes/rag-recommend';
import ragSearchRoute from './routes/rag-search';

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
app.route('/api/ollama/health', ollamaHealthRoute);
app.route('/api/rag/search', ragSearchRoute);
app.route('/api/rag/ask', ragAskRoute);
app.route('/api/rag/explain', ragExplainRoute);
app.route('/api/rag/recommend', ragRecommendRoute);

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
