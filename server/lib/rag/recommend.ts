import { generateText } from '../ollama';
import { searchArticleChunks } from './search';
import type { RagSearchResult } from './types';

export interface RecommendNextInput {
  weakTopics: string[];
  strongTopics: string[];
  recentQueries: string[];
}

export interface RecommendNextResponse {
  recommendation: string;
  sources: RagSearchResult[];
}

export const RECOMMEND_NEXT_SYSTEM_PROMPT = `Ты — помощник образовательной платформы.

Рекомендуй, что изучить дальше, только на основе персонального контекста и источников платформы.
Отвечай кратко, понятно и только на русском языке.
Объясни, почему эта тема полезна.
Не придумывай ссылки: приложение покажет источники отдельно.`;

function firstNonEmpty(values: string[]) {
  return values.find((value) => value.trim())?.trim();
}

function buildRecommendationTopic(input: RecommendNextInput) {
  return firstNonEmpty(input.weakTopics)
    || firstNonEmpty(input.recentQueries)
    || 'основы prompt engineering';
}

function buildRecommendPrompt(
  input: RecommendNextInput,
  topic: string,
  sources: RagSearchResult[],
) {
  const sourceBlocks = sources.map((source, index) => {
    return `[Источник ${index + 1}]
Статья: ${source.title}
Раздел: ${source.sectionTitle}
URL: ${source.url}
Текст:
${source.text}`;
  });

  return `Тема для рекомендации:
${topic}

Персональный контекст:
- Слабые темы: ${input.weakTopics.join(', ') || 'нет данных'}
- Сильные темы: ${input.strongTopics.join(', ') || 'нет данных'}
- Недавние вопросы: ${input.recentQueries.join('; ') || 'нет данных'}

Источники платформы:

${sourceBlocks.join('\n\n')}

Кратко порекомендуй, что изучить дальше и почему.`;
}

export async function recommendNext(
  input: RecommendNextInput,
): Promise<RecommendNextResponse> {
  const topic = buildRecommendationTopic(input);
  const search = await searchArticleChunks(topic, 3);
  const prompt = buildRecommendPrompt(input, topic, search.results);
  const recommendation = await generateText(prompt, RECOMMEND_NEXT_SYSTEM_PROMPT);

  return {
    recommendation,
    sources: search.results,
  };
}
