import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { embedText, getOllamaEmbedModel } from '../server/lib/ollama';
import { buildArticleChunks } from '../server/lib/rag/content';
import type { IndexedRagChunk, RagIndex } from '../server/lib/rag/types';

const outputPath = resolve('server/data/rag-index.json');

function assertUniqueChunkIds(chunks: Array<{ id: string }>) {
  const ids = new Set<string>();

  chunks.forEach((chunk) => {
    if (ids.has(chunk.id)) {
      throw new Error(`Duplicate chunk id found: ${chunk.id}.`);
    }

    ids.add(chunk.id);
  });
}

function assertEmbedding(embedding: number[], chunkId: string) {
  if (embedding.length === 0) {
    throw new Error(`Embedding for ${chunkId} is empty.`);
  }

  const hasInvalidValue = embedding.some((value) => !Number.isFinite(value));

  if (hasInvalidValue) {
    throw new Error(`Embedding for ${chunkId} contains a non-finite number.`);
  }
}

async function buildIndex() {
  const chunks = buildArticleChunks();

  if (chunks.length === 0) {
    throw new Error('Cannot build RAG index because article chunks array is empty.');
  }

  assertUniqueChunkIds(chunks);

  const indexedChunks: IndexedRagChunk[] = [];
  let dimensions: number | null = null;

  for (const [index, chunk] of chunks.entries()) {
    console.log(`Embedding ${index + 1}/${chunks.length}: ${chunk.id}`);

    const embedding = await embedText(chunk.text, 'document');
    assertEmbedding(embedding, chunk.id);

    if (dimensions === null) {
      dimensions = embedding.length;
    } else if (embedding.length !== dimensions) {
      throw new Error(
        `Embedding dimensions mismatch for ${chunk.id}: expected ${dimensions}, got ${embedding.length}.`,
      );
    }

    indexedChunks.push({
      ...chunk,
      embedding,
    });
  }

  if (!dimensions || dimensions <= 0) {
    throw new Error('Embedding dimensions must be greater than zero.');
  }

  const index: RagIndex = {
    version: 1,
    generatedAt: new Date().toISOString(),
    embeddingModel: getOllamaEmbedModel(),
    dimensions,
    chunks: indexedChunks,
  };

  await mkdir(resolve('server/data'), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  console.log('RAG index build passed.');
  console.log(`Output: ${outputPath}`);
  console.log(`Embedding model: ${index.embeddingModel}`);
  console.log(`Chunks indexed: ${index.chunks.length}`);
  console.log(`Embedding dimensions: ${index.dimensions}`);
}

buildIndex().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RAG index build failed: ${message}`);
  process.exit(1);
});
