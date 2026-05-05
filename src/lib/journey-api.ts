import type {
  BuildReportRequest,
  BuildReportResponse,
  EvaluateAttemptRequest,
  EvaluateAttemptResponse,
  JourneyGenerateRequest,
  JourneyGenerateResponse,
} from './journey';

async function requestJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function generateJourney(payload: JourneyGenerateRequest) {
  const data = await requestJson<JourneyGenerateResponse>(
    '/api/journey/generate',
    payload,
  );

  return data.journey;
}

export async function evaluateJourneyAttempt(payload: EvaluateAttemptRequest) {
  const data = await requestJson<EvaluateAttemptResponse>(
    '/api/attempt/evaluate',
    payload,
  );

  return data.evaluation;
}

export async function buildJourneyReport(payload: BuildReportRequest) {
  const data = await requestJson<BuildReportResponse>(
    '/api/report/build',
    payload,
  );

  return data.report;
}
