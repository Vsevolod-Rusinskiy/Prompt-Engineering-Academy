import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

let client: OpenAI | null = null;

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim() ?? '';
}

export function isOpenAIConfigured() {
  return getApiKey().length > 0;
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini';
}

function getClient() {
  if (!isOpenAIConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  if (!client) {
    client = new OpenAI({
      apiKey: getApiKey(),
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
    });
  }

  return client;
}

interface StructuredCompletionOptions<TSchema extends z.ZodTypeAny> {
  schema: TSchema;
  schemaName: string;
  system: string;
  user: string;
  model?: string;
}

export async function requestStructuredCompletion<TSchema extends z.ZodTypeAny>({
  schema,
  schemaName,
  system,
  user,
  model,
}: StructuredCompletionOptions<TSchema>): Promise<z.infer<TSchema>> {
  const response = await getClient().responses.parse({
    model: model ?? getOpenAIModel(),
    input: [
      {
        role: 'system',
        content: system,
      },
      {
        role: 'user',
        content: user,
      },
    ],
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });

  if (!response.output_parsed) {
    throw new Error(
      response.output_text
        ? `OpenAI did not return parsed output: ${response.output_text}`
        : 'OpenAI did not return parsed output.',
    );
  }

  return response.output_parsed;
}
