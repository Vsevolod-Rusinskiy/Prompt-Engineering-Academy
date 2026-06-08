import { searchArticleChunks } from '../server/lib/rag/search';

const cases = [
  {
    query:
      'Что такое галлюцинации языковой модели и почему ей нельзя слепо доверять?',
    expectedSourceId: 'hallucinations-and-safety',
  },
  {
    query:
      'Как языковая модель разбивает текст на токены?',
    expectedSourceId: 'llm-and-tokens',
  },
  {
    query:
      'Как правильно составить промпт с ролью, контекстом и ограничениями?',
    expectedSourceId: 'prompt-structure',
  },
];

async function main() {
  let passedCases = 0;

  for (const testCase of cases) {
    const response = await searchArticleChunks(testCase.query, 3);

    if (response.results.length !== 3) {
      throw new Error(`Expected 3 results for query "${testCase.query}", got ${response.results.length}.`);
    }

    const [topResult] = response.results;

    if (!topResult) {
      throw new Error(`No top result returned for query "${testCase.query}".`);
    }

    if (topResult.sourceId !== testCase.expectedSourceId) {
      throw new Error(
        `Expected top sourceId ${testCase.expectedSourceId} for query "${testCase.query}", got ${topResult.sourceId}.`,
      );
    }

    if (!Number.isFinite(topResult.score)) {
      throw new Error(`Top result score is not finite for query "${testCase.query}".`);
    }

    if ('embedding' in topResult) {
      throw new Error(`Search result must not include embedding for query "${testCase.query}".`);
    }

    console.log(`Query: ${testCase.query}`);
    console.log(`Top result: ${topResult.title} → ${topResult.sectionTitle}`);
    console.log(`Source ID: ${topResult.sourceId}`);
    console.log(`Score: ${topResult.score.toFixed(4)}`);
    console.log(`URL: ${topResult.url}`);
    console.log('');

    passedCases += 1;
  }

  console.log('RAG semantic search test passed.');
  console.log(`Cases passed: ${passedCases}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`RAG semantic search test failed: ${message}`);
  process.exit(1);
});
