export interface OllamaModel {
  name: string;
  model?: string;
}

export interface OllamaHealthResult {
  status: 'ok' | 'error';
  baseUrl: string;
  requiredModels: string[];
  availableModels: string[];
  missingModels: string[];
  message?: string;
}

export type OllamaEmbeddingPurpose = 'query' | 'document';

export interface OllamaEmbedResponse {
  model?: string;
  embeddings?: unknown;
}

export interface OllamaGenerateResponse {
  model?: string;
  response?: unknown;
}

interface OllamaTagsResponse {
  models?: OllamaModel[];
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';
}

export function getOllamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL?.trim() || 'nomic-embed-text-v2-moe:latest';
}

export function getOllamaChatModel(): string {
  return process.env.OLLAMA_CHAT_MODEL?.trim() || 'qwen3.5:4b';
}

export function getRequiredOllamaModels(): string[] {
  return [
    getOllamaEmbedModel(),
    getOllamaChatModel(),
  ];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function readModelName(model: OllamaModel): string | null {
  if (typeof model.name === 'string' && model.name.trim()) {
    return model.name.trim();
  }

  if (typeof model.model === 'string' && model.model.trim()) {
    return model.model.trim();
  }

  return null;
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'number');
}

export function buildEmbeddingInput(
  text: string,
  purpose: OllamaEmbeddingPurpose,
): string {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error('Embedding input text must not be empty.');
  }

  if (purpose === 'query') {
    return `search_query: ${trimmedText}`;
  }

  return `search_document: ${trimmedText}`;
}

export async function listOllamaModels(): Promise<string[]> {
  const baseUrl = normalizeBaseUrl(getOllamaBaseUrl());

  try {
    const response = await fetch(`${baseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Ollama /api/tags returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as OllamaTagsResponse;

    if (!data || !Array.isArray(data.models)) {
      throw new Error('Ollama /api/tags returned an unexpected response shape.');
    }

    return data.models
      .map(readModelName)
      .filter((modelName): modelName is string => Boolean(modelName));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to list Ollama models from ${baseUrl}: ${message}`);
  }
}

export async function embedText(
  text: string,
  purpose: OllamaEmbeddingPurpose,
): Promise<number[]> {
  const baseUrl = normalizeBaseUrl(getOllamaBaseUrl());
  const model = getOllamaEmbedModel();
  const input = buildEmbeddingInput(text, purpose);

  try {
    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama /api/embed returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;

    if (!data || !Array.isArray(data.embeddings)) {
      throw new Error('Ollama /api/embed returned an unexpected response shape.');
    }

    const firstEmbedding = data.embeddings[0];

    if (!isNumberArray(firstEmbedding)) {
      throw new Error('Ollama /api/embed did not return a non-empty numeric embedding.');
    }

    return firstEmbedding;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to generate Ollama embedding from ${baseUrl}: ${message}`);
  }
}

export async function generateText(
  prompt: string,
  system?: string,
): Promise<string> {
  const baseUrl = normalizeBaseUrl(getOllamaBaseUrl());
  const model = getOllamaChatModel();
  const normalizedPrompt = prompt.trim();

  if (!normalizedPrompt) {
    throw new Error('Generation prompt must not be empty.');
  }

  const body: Record<string, unknown> = {
    model,
    prompt: normalizedPrompt,
    stream: false,
    think: false,
  };

  if (system !== undefined) {
    const normalizedSystem = system.trim();

    if (normalizedSystem) {
      body.system = normalizedSystem;
    }
  }

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama /api/generate returned HTTP ${response.status}.`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;

    if (typeof data.response !== 'string' || !data.response.trim()) {
      throw new Error('Ollama /api/generate did not return a non-empty text response.');
    }

    return data.response.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to generate Ollama text from ${baseUrl}: ${message}`);
  }
}

export async function checkOllamaHealth(): Promise<OllamaHealthResult> {
  const baseUrl = normalizeBaseUrl(getOllamaBaseUrl());
  const requiredModels = getRequiredOllamaModels();

  try {
    const availableModels = await listOllamaModels();
    const availableModelSet = new Set(availableModels);
    const missingModels = requiredModels.filter(
      (modelName) => !availableModelSet.has(modelName),
    );

    if (missingModels.length > 0) {
      return {
        status: 'error',
        baseUrl,
        requiredModels,
        availableModels,
        missingModels,
        message: `Missing required Ollama models: ${missingModels.join(', ')}.`,
      };
    }

    return {
      status: 'ok',
      baseUrl,
      requiredModels,
      availableModels,
      missingModels: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      status: 'error',
      baseUrl,
      requiredModels,
      availableModels: [],
      missingModels: requiredModels,
      message,
    };
  }
}
