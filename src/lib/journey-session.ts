import type {
  JourneyAttempt,
  KnowledgeJourneySession,
} from './journey';

const STORAGE_KEY = 'knowledge-journey-session';

function isJourneySession(value: unknown): value is KnowledgeJourneySession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    Boolean(candidate.journey) &&
    Array.isArray(candidate.attempts) &&
    typeof candidate.currentCheckpointIndex === 'number' &&
    typeof candidate.startedAt === 'string'
  );
}

export function readJourneySession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isJourneySession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeJourneySession(session: KnowledgeJourneySession) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearJourneySession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function upsertJourneyAttempt(
  session: KnowledgeJourneySession,
  nextAttempt: JourneyAttempt,
) {
  const nextAttempts = [...session.attempts];
  const existingIndex = nextAttempts.findIndex(
    (attempt) => attempt.activityId === nextAttempt.activityId,
  );

  if (existingIndex >= 0) {
    nextAttempts[existingIndex] = nextAttempt;
  } else {
    nextAttempts.push(nextAttempt);
  }

  return {
    ...session,
    attempts: nextAttempts,
  };
}

function getLongestCorrectStreak(attempts: JourneyAttempt[]) {
  let current = 0;
  let longest = 0;

  attempts.forEach((attempt) => {
    if (attempt.evaluation?.status === 'correct') {
      current += 1;
      longest = Math.max(longest, current);
      return;
    }

    current = 0;
  });

  return longest;
}

function getCurrentCorrectStreak(attempts: JourneyAttempt[]) {
  let streak = 0;

  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (attempts[index].evaluation?.status === 'correct') {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

export function getJourneyStats(session: KnowledgeJourneySession) {
  const totalActivities = session.journey.checkpoints.reduce(
    (total, checkpoint) => total + checkpoint.activities.length,
    0,
  );
  const totalXp = session.attempts.reduce(
    (total, attempt) => total + (attempt.evaluation?.xpAwarded ?? 0),
    0,
  );
  const answeredActivities = session.attempts.length;
  const correctActivities = session.attempts.filter(
    (attempt) => attempt.evaluation?.status === 'correct',
  ).length;
  const longestStreak = getLongestCorrectStreak(session.attempts);
  const currentStreak = getCurrentCorrectStreak(session.attempts);
  const achievements: string[] = [];

  if (answeredActivities > 0) {
    achievements.push('Первый ответ');
  }

  if (longestStreak >= 3) {
    achievements.push('3 точных подряд');
  }

  if (totalXp >= 80) {
    achievements.push('80 XP');
  }

  if (session.report) {
    achievements.push('Journey завершен');
  }

  return {
    totalActivities,
    answeredActivities,
    correctActivities,
    totalXp,
    currentStreak,
    longestStreak,
    achievements,
  };
}
