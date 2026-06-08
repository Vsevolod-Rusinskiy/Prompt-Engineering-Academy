import { embedText, getOllamaEmbedModel } from '../server/lib/ollama';

const testText =
  'Галлюцинации языковой модели — это уверенные ответы, которые не подтверждаются источниками.';

function formatPreview(embedding: number[]) {
  return `[${embedding.slice(0, 5).join(', ')}]`;
}

async function main() {
  const documentEmbedding = await embedText(testText, 'document');
  const queryEmbedding = await embedText(testText, 'query');

  if (documentEmbedding.length === 0) {
    throw new Error('Document embedding is empty.');
  }

  if (queryEmbedding.length === 0) {
    throw new Error('Query embedding is empty.');
  }

  if (documentEmbedding.length !== queryEmbedding.length) {
    throw new Error(
      `Embedding dimensions do not match: document=${documentEmbedding.length}, query=${queryEmbedding.length}.`,
    );
  }

  console.log('Ollama embedding test passed.');
  console.log(`Model: ${getOllamaEmbedModel()}`);
  console.log(`Document embedding dimensions: ${documentEmbedding.length}`);
  console.log(`Query embedding dimensions: ${queryEmbedding.length}`);
  console.log(`Document embedding preview: ${formatPreview(documentEmbedding)}`);
  console.log(`Query embedding preview: ${formatPreview(queryEmbedding)}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Ollama embedding test failed: ${message}`);
  process.exit(1);
});
