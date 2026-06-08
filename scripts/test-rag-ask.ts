import { askPlatform } from '../server/lib/rag/ask';

const query =
  'Что такое галлюцинации языковой модели и почему ей нельзя слепо доверять?';

async function main() {
  const response = await askPlatform(query);

  if (typeof response.answer !== 'string' || !response.answer.trim()) {
    throw new Error('Expected a non-empty RAG answer.');
  }

  if (response.answer.length > 2500) {
    throw new Error(`Expected answer length to be at most 2500 characters, got ${response.answer.length}.`);
  }

  if (response.sources.length !== 3) {
    throw new Error(`Expected 3 sources, got ${response.sources.length}.`);
  }

  const [topSource] = response.sources;

  if (!topSource) {
    throw new Error('Expected a top source.');
  }

  if (topSource.sourceId !== 'hallucinations-and-safety') {
    throw new Error(`Expected top sourceId hallucinations-and-safety, got ${topSource.sourceId}.`);
  }

  const sourceWithEmbedding = response.sources.find((source) => 'embedding' in source);

  if (sourceWithEmbedding) {
    throw new Error(`Source ${sourceWithEmbedding.id} must not include an embedding.`);
  }

  console.log('RAG answer test passed.');
  console.log(`Query: ${response.query}`);
  console.log('Answer:');
  console.log(response.answer);
  console.log('');
  console.log('Sources:');

  response.sources.forEach((source, index) => {
    console.log(`${index + 1}. ${source.title} → ${source.sectionTitle}`);
    console.log(`   URL: ${source.url}`);
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RAG answer test failed: ${message}`);
  process.exit(1);
});
