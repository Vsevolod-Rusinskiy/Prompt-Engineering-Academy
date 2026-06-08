export interface RagSource {
  id: string;
  sourceType: 'article';
  sourceId: string;
  title: string;
  sectionTitle: string;
  text: string;
  url: string;
  score: number;
}

export interface RagAskResponse {
  query: string;
  answer: string;
  sources: RagSource[];
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown; message?: unknown };
    const details = [data.error, data.message]
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(' ');

    if (details) {
      return details;
    }
  } catch {
    // Fall back to the status text below.
  }

  return `Не удалось получить ответ платформы. HTTP ${response.status}.`;
}

export async function askPlatform(query: string): Promise<RagAskResponse> {
  const response = await fetch('/api/rag/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as RagAskResponse;
}

export async function explainSimply(
  text: string,
  title?: string,
): Promise<{ explanation: string }> {
  const response = await fetch('/api/rag/explain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, title }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as { explanation: string };
}

export async function recommendNext(input: {
  weakTopics: string[];
  strongTopics: string[];
  recentQueries: string[];
}): Promise<{
  recommendation: string;
  sources: RagSource[];
}> {
  const response = await fetch('/api/rag/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as {
    recommendation: string;
    sources: RagSource[];
  };
}
