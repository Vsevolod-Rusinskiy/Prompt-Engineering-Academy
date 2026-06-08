import { generateText } from '../ollama';
import { searchArticleChunks } from './search';
import type { RagAskResponse, RagSearchResult } from './types';

export const RAG_ANSWER_SYSTEM_PROMPT = `Ты — помощник образовательной платформы.

Отвечай только на основании предоставленных источников платформы.

Правила:
- Не добавляй факты, которых нет в источниках.
- Если источников недостаточно, прямо скажи: «В материалах платформы недостаточно информации для точного ответа».
- Отвечай кратко и понятно.
- Используй русский язык.
- Не придумывай ссылки.
- Не добавляй список источников самостоятельно: приложение покажет его отдельно.`;

export function buildRagAnswerPrompt(
  query: string,
  sources: RagSearchResult[],
): string {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error('RAG answer query must not be empty.');
  }

  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error('RAG answer sources must not be empty.');
  }

  const sourceBlocks = sources.map((source, index) => {
    return `[Источник ${index + 1}]
Статья: ${source.title}
Раздел: ${source.sectionTitle}
URL: ${source.url}
Текст:
${source.text}`;
  });

  return `Вопрос пользователя:

${normalizedQuery}

Источники платформы:

${sourceBlocks.join('\n\n')}`;
}

export async function askPlatform(
  query: string,
): Promise<RagAskResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error('RAG answer query must not be empty.');
  }

  const search = await searchArticleChunks(normalizedQuery, 3);
  const prompt = buildRagAnswerPrompt(normalizedQuery, search.results);
  const answer = await generateText(prompt, RAG_ANSWER_SYSTEM_PROMPT);

  return {
    query: normalizedQuery,
    answer,
    sources: search.results,
  };
}
