import { generateText } from '../ollama';

export const EXPLAIN_SIMPLY_SYSTEM_PROMPT = `Ты — помощник образовательной платформы.

Объясняй переданный текст простыми словами на русском языке.
Используй только переданный текст.
Если данных недостаточно, прямо скажи: «В переданном тексте недостаточно информации для точного объяснения».
Отвечай кратко и понятно.`;

export function buildExplainSimplyPrompt(text: string, title?: string): string {
  const normalizedText = text.trim();
  const normalizedTitle = title?.trim();

  if (!normalizedText) {
    throw new Error('Text for explanation must not be empty.');
  }

  return `Тема:
${normalizedTitle || 'Без названия'}

Текст:
${normalizedText}

Объясни этот текст проще.`;
}

export async function explainSimply(text: string, title?: string) {
  const prompt = buildExplainSimplyPrompt(text, title);
  const explanation = await generateText(prompt, EXPLAIN_SIMPLY_SYSTEM_PROMPT);

  return { explanation };
}
