import { buildArticleChunks } from '../server/lib/rag/content';
import type { RagChunk } from '../server/lib/rag/types';

function assertChunk(chunk: RagChunk) {
  const requiredFields: Array<keyof RagChunk> = [
    'id',
    'sourceId',
    'title',
    'sectionTitle',
    'text',
    'url',
  ];

  if (chunk.sourceType !== 'article') {
    throw new Error(`Chunk ${chunk.id || '<missing id>'} has invalid sourceType.`);
  }

  requiredFields.forEach((field) => {
    if (!String(chunk[field]).trim()) {
      throw new Error(`Chunk ${chunk.id || '<missing id>'} is missing ${field}.`);
    }
  });
}

function buildPreview(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 140);
}

function main() {
  const chunks = buildArticleChunks();

  if (chunks.length === 0) {
    throw new Error('Article chunks array is empty.');
  }

  const ids = new Set<string>();

  chunks.forEach((chunk) => {
    assertChunk(chunk);

    if (ids.has(chunk.id)) {
      throw new Error(`Duplicate chunk id found: ${chunk.id}.`);
    }

    ids.add(chunk.id);
  });

  const representedArticles = new Set(chunks.map((chunk) => chunk.sourceId));

  console.log('Article chunk build passed.');
  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Articles represented: ${representedArticles.size}`);
  console.log('');
  console.log('Chunks:');

  chunks.forEach((chunk) => {
    console.log(`- ${chunk.id}`);
    console.log(`  Source: ${chunk.title} → ${chunk.sectionTitle}`);
    console.log(`  URL: ${chunk.url}`);
    console.log(`  Text preview: ${buildPreview(chunk.text)}`);
  });
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Article chunk build failed: ${message}`);
  process.exit(1);
}
