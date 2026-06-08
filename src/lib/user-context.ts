export interface UserQuizAttempt {
  completedAt: string;
  score: number;
  total: number;
  percentage: number;
  recommendation?: string;
}

export interface UserJourneyReportEntry {
  completedAt: string;
  score: number;
  masteredConcepts: string[];
  weakConcepts: string[];
}

export interface UserContext {
  version: 1;
  recentQueries: string[];
  quizAttempts: UserQuizAttempt[];
  journeyReports: UserJourneyReportEntry[];
  strongTopics: string[];
  weakTopics: string[];
  updatedAt: string;
}

const STORAGE_KEY = 'prompt-engineering-user-context';
const MAX_ITEMS = 10;

function createEmptyContext(): UserContext {
  return {
    version: 1,
    recentQueries: [],
    quizAttempts: [],
    journeyReports: [],
    strongTopics: [],
    weakTopics: [],
    updatedAt: new Date().toISOString(),
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function rebuildTopics(journeyReports: UserJourneyReportEntry[]) {
  return {
    strongTopics: unique(journeyReports.flatMap((report) => report.masteredConcepts)),
    weakTopics: unique(journeyReports.flatMap((report) => report.weakConcepts)),
  };
}

function isUserContext(value: unknown): value is UserContext {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.version === 1 &&
    Array.isArray(candidate.recentQueries) &&
    Array.isArray(candidate.quizAttempts) &&
    Array.isArray(candidate.journeyReports)
  );
}

export function loadUserContext(): UserContext {
  if (typeof window === 'undefined') {
    return createEmptyContext();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createEmptyContext();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isUserContext(parsed)) {
      return createEmptyContext();
    }

    const journeyReports = parsed.journeyReports.slice(0, MAX_ITEMS);
    const topics = rebuildTopics(journeyReports);

    return {
      ...parsed,
      recentQueries: parsed.recentQueries.slice(0, MAX_ITEMS),
      quizAttempts: parsed.quizAttempts.slice(0, MAX_ITEMS),
      journeyReports,
      ...topics,
    };
  } catch {
    return createEmptyContext();
  }
}

export function saveUserContext(context: UserContext): void {
  if (typeof window === 'undefined') {
    return;
  }

  const journeyReports = context.journeyReports.slice(0, MAX_ITEMS);
  const topics = rebuildTopics(journeyReports);

  const nextContext: UserContext = {
    ...context,
    recentQueries: unique(context.recentQueries).slice(0, MAX_ITEMS),
    quizAttempts: context.quizAttempts.slice(0, MAX_ITEMS),
    journeyReports,
    ...topics,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextContext));
}

export function recordRecentQuery(query: string): void {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return;
  }

  const context = loadUserContext();

  saveUserContext({
    ...context,
    recentQueries: [
      normalizedQuery,
      ...context.recentQueries.filter((entry) => entry !== normalizedQuery),
    ].slice(0, MAX_ITEMS),
  });
}

export function recordQuizAttempt(attempt: UserQuizAttempt): void {
  const context = loadUserContext();

  saveUserContext({
    ...context,
    quizAttempts: [attempt, ...context.quizAttempts].slice(0, MAX_ITEMS),
  });
}

export function recordJourneyReport(report: UserJourneyReportEntry): void {
  const context = loadUserContext();

  saveUserContext({
    ...context,
    journeyReports: [report, ...context.journeyReports].slice(0, MAX_ITEMS),
  });
}
