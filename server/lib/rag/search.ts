import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedText } from '../ollama';
import type {
  IndexedRagChunk,
  RagIndex,
  RagSearchResponse,
  RagSearchResult,
} from './types';

export const DEFAULT_RAG_TOP_K = 3;
export const MAX_RAG_TOP_K = 5;

const currentDir = dirname(fileURLToPath(import.meta.url));
const ragIndexPath = resolve(currentDir, '../../data/rag-index.json');

function assertFiniteNumberArray(value: unknown, label: string): asserts value is number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty number array.`);
  }

  const invalidIndex = value.findIndex((item) => typeof item !== 'number' || !Number.isFinite(item));

  if (invalidIndex >= 0) {
    throw new Error(`${label} contains a non-finite number at index ${invalidIndex}.`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertIndexedChunk(value: unknown, dimensions: number, index: number): asserts value is IndexedRagChunk {
  if (!value || typeof value !== 'object') {
    throw new Error(`Chunk at index ${index} must be an object.`);
  }

  const chunk = value as Record<string, unknown>;

  assertString(chunk.id, `Chunk ${index} id`);
  assertString(chunk.sourceId, `Chunk ${chunk.id} sourceId`);
  assertString(chunk.title, `Chunk ${chunk.id} title`);
  assertString(chunk.sectionTitle, `Chunk ${chunk.id} sectionTitle`);
  assertString(chunk.text, `Chunk ${chunk.id} text`);
  assertString(chunk.url, `Chunk ${chunk.id} url`);

  if (chunk.sourceType !== 'article') {
    throw new Error(`Chunk ${chunk.id} sourceType must be article.`);
  }

  assertFiniteNumberArray(chunk.embedding, `Chunk ${chunk.id} embedding`);

  if (chunk.embedding.length !== dimensions) {
    throw new Error(
      `Chunk ${chunk.id} embedding dimensions mismatch: expected ${dimensions}, got ${chunk.embedding.length}.`,
    );
  }
}

function normalizeTopK(topK?: number) {
  if (topK === undefined) {
    return DEFAULT_RAG_TOP_K;
  }

  if (!Number.isInteger(topK) || topK < 1 || topK > MAX_RAG_TOP_K) {
    throw new Error(`topK must be an integer from 1 to ${MAX_RAG_TOP_K}.`);
  }

  return topK;
}

export function cosineSimilarity(
  left: number[],
  right: number[],
): number {
  assertFiniteNumberArray(left, 'Left vector');
  assertFiniteNumberArray(right, 'Right vector');

  if (left.length !== right.length) {
    throw new Error(`Vector dimensions mismatch: left=${left.length}, right=${right.length}.`);
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  const leftNorm = Math.sqrt(leftMagnitude);
  const rightNorm = Math.sqrt(rightMagnitude);

  if (leftNorm === 0 || rightNorm === 0) {
    throw new Error('Cannot compute cosine similarity for a zero-norm vector.');
  }

  return dotProduct / (leftNorm * rightNorm);
}

export async function loadRagIndex(): Promise<RagIndex> {
  let rawIndex: string;

  try {
    rawIndex = await readFile(ragIndexPath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read RAG index at ${ragIndexPath}. Run "npm run rag:index" first. ${message}`,
    );
  }

  const parsed = JSON.parse(rawIndex) as unknown;

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('RAG index must be a JSON object.');
  }

  const index = parsed as Record<string, unknown>;

  if (index.version !== 1) {
    throw new Error('RAG index version must be 1.');
  }

  assertString(index.embeddingModel, 'RAG index embeddingModel');

  if (typeof index.dimensions !== 'number' || !Number.isInteger(index.dimensions) || index.dimensions <= 0) {
    throw new Error('RAG index dimensions must be a positive integer.');
  }

  const dimensions = index.dimensions;

  if (!Array.isArray(index.chunks) || index.chunks.length === 0) {
    throw new Error('RAG index chunks must be a non-empty array.');
  }

  index.chunks.forEach((chunk, chunkIndex) => {
    assertIndexedChunk(chunk, dimensions, chunkIndex);
  });

  return index as unknown as RagIndex;
}

export async function searchArticleChunks(
  query: string,
  topK?: number,
): Promise<RagSearchResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error('Search query must not be empty.');
  }

  const normalizedTopK = normalizeTopK(topK);
  const queryEmbedding = await embedText(normalizedQuery, 'query');
  const index = await loadRagIndex();

  if (queryEmbedding.length !== index.dimensions) {
    throw new Error(
      `Query embedding dimensions mismatch: expected ${index.dimensions}, got ${queryEmbedding.length}.`,
    );
  }

  const results: RagSearchResult[] = index.chunks
    .map((chunk) => ({
      id: chunk.id,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      title: chunk.title,
      sectionTitle: chunk.sectionTitle,
      text: chunk.text,
      url: chunk.url,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.id.localeCompare(right.id);
    })
    .slice(0, normalizedTopK);

  return {
    query: normalizedQuery,
    topK: normalizedTopK,
    results,
  };
}
