import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { JourneyActivityCard } from '../components/journey/JourneyActivityCard';
import { buildJourneyReport } from '../lib/journey-api';
import {
  clearJourneySession,
  getJourneyStats,
  readJourneySession,
  upsertJourneyAttempt,
  writeJourneySession,
} from '../lib/journey-session';
import type { JourneyAttempt, KnowledgeJourneySession } from '../lib/journey';

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
}

export function JourneyRunPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readJourneySession());
  const [now, setNow] = useState(() => Date.now());
  const [isBuildingReport, setIsBuildingReport] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!session || session.checkpointStartedAt !== null) {
      return;
    }

    persistSession({
      ...session,
      checkpointStartedAt: new Date().toISOString(),
    });
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const currentCheckpoint = session.journey.checkpoints[session.currentCheckpointIndex];

    if (!currentCheckpoint) {
      if (session.report) {
        navigate('/journey/report', { replace: true });
        return;
      }

      navigate('/journey', { replace: true });
    }
  }, [navigate, session]);

  const currentCheckpoint = session?.journey.checkpoints[session.currentCheckpointIndex];
  const attemptsByActivityId = useMemo(
    () =>
      new Map(
        (session?.attempts ?? []).map((attempt) => [attempt.activityId, attempt]),
      ),
    [session?.attempts],
  );

  const stats = session ? getJourneyStats(session) : null;
  const answeredCurrentCheckpoint = currentCheckpoint
    ? currentCheckpoint.activities.filter((activity) => attemptsByActivityId.has(activity.id))
        .length
    : 0;
  const allCurrentActivitiesAnswered =
    Boolean(currentCheckpoint) &&
    answeredCurrentCheckpoint === (currentCheckpoint?.activities.length ?? 0);

  const remainingCheckpointSeconds = useMemo(() => {
    if (!session || !currentCheckpoint?.timerSeconds || !session.checkpointStartedAt) {
      return null;
    }

    const startedAt = new Date(session.checkpointStartedAt).getTime();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    return Math.max(currentCheckpoint.timerSeconds - elapsedSeconds, 0);
  }, [currentCheckpoint?.timerSeconds, now, session]);

  const checkpointExpired =
    currentCheckpoint?.timerSeconds !== undefined && remainingCheckpointSeconds === 0;
  const canAdvance = allCurrentActivitiesAnswered || checkpointExpired;

  function persistSession(nextSession: KnowledgeJourneySession) {
    setSession(nextSession);
    writeJourneySession(nextSession);
  }

  function handleRecordedAttempt(nextAttempt: JourneyAttempt) {
    if (!session) {
      return;
    }

    persistSession(upsertJourneyAttempt(session, nextAttempt));
  }

  async function handleAdvance() {
    if (!session || !currentCheckpoint || !canAdvance) {
      return;
    }

    setError('');

    if (session.currentCheckpointIndex === session.journey.checkpoints.length - 1) {
      setIsBuildingReport(true);

      try {
        const report = await buildJourneyReport({
          journey: session.journey,
          attempts: session.attempts,
        });

        const nextSession = {
          ...session,
          report,
        };

        persistSession(nextSession);
        navigate('/journey/report');
      } catch (buildError) {
        setError(
          buildError instanceof Error
            ? buildError.message
            : 'Не удалось собрать отчёт.',
        );
      } finally {
        setIsBuildingReport(false);
      }

      return;
    }

    persistSession({
      ...session,
      currentCheckpointIndex: session.currentCheckpointIndex + 1,
      checkpointStartedAt: new Date().toISOString(),
    });
  }

  function handleReset() {
    clearJourneySession();
    setSession(null);
    navigate('/journey');
  }

  if (!session || !currentCheckpoint || !stats) {
    return (
      <div className="not-found">
        <p className="eyebrow">Journey</p>
        <h1>Нет активной сессии.</h1>
        <Link className="button button--primary" to="/journey">
          Открыть генерацию
        </Link>
      </div>
    );
  }

  return (
    <div className="journey-page">
      <section className="quiz-page__intro">
        <div>
          <p className="eyebrow">Чекпоинт {session.currentCheckpointIndex + 1}</p>
          <h1>{session.journey.title}</h1>
          <p>{currentCheckpoint.goal}</p>
        </div>
        <div className="quiz-page__meta">
          <p>
            Прогресс: {session.currentCheckpointIndex + 1} /{' '}
            {session.journey.checkpoints.length}
          </p>
          <p>
            Ответы: {stats.answeredActivities} / {stats.totalActivities}
          </p>
        </div>
      </section>

      <div className="journey-grid">
        <div className="journey-main">
          <section className="article-section">
            <p className="eyebrow">Текущий чекпоинт</p>
            <h2>{currentCheckpoint.title}</h2>
            {currentCheckpoint.narrativeBeat ? (
              <div className="audit__prompt">
                <p className="audit__label">Сценарий</p>
                <blockquote>{currentCheckpoint.narrativeBeat}</blockquote>
              </div>
            ) : null}
            <p>
              Закрыто активностей: {answeredCurrentCheckpoint} /{' '}
              {currentCheckpoint.activities.length}
            </p>
            {checkpointExpired ? (
              <p className="journey-warning">Время вышло. Можно переходить к следующему этапу.</p>
            ) : null}
          </section>

          <section className="quiz-list">
            {currentCheckpoint.activities.map((activity) => (
              <JourneyActivityCard
                activity={activity}
                attempt={attemptsByActivityId.get(activity.id)}
                checkpointId={currentCheckpoint.id}
                journeyId={session.journey.id}
                key={activity.id}
                locked={Boolean(checkpointExpired)}
                onRecorded={handleRecordedAttempt}
              />
            ))}
          </section>

          <section className="quiz-summary-panel">
            <button
              className="button button--primary"
              data-testid="journey-advance"
              disabled={!canAdvance || isBuildingReport}
              onClick={handleAdvance}
              type="button"
            >
              {isBuildingReport
                ? 'Собираю отчёт...'
                : session.currentCheckpointIndex === session.journey.checkpoints.length - 1
                  ? 'Собрать отчёт'
                  : 'Следующий чекпоинт'}
            </button>
            <button className="button button--ghost" onClick={handleReset} type="button">
              Сбросить journey
            </button>
            {error ? <p className="journey-error">{error}</p> : null}
          </section>
        </div>

        <aside className="journey-sidebar">
          <section className="summary-card">
            <p className="eyebrow">Давление</p>
            <h2>
              {remainingCheckpointSeconds !== null
                ? formatSeconds(remainingCheckpointSeconds)
                : 'Без таймера'}
            </h2>
            <p>
              {currentCheckpoint.timerSeconds
                ? `Лимит на чекпоинт: ${formatSeconds(currentCheckpoint.timerSeconds)}`
                : 'Для этого режима таймер не включён.'}
            </p>
          </section>

          <section className="summary-card">
            <p className="eyebrow">Геймификация</p>
            <p>XP: {stats.totalXp}</p>
            <p>Текущий streak: {stats.currentStreak}</p>
            <p>Точных ответов: {stats.correctActivities}</p>
          </section>

          <section className="summary-card">
            <p className="eyebrow">Достижения</p>
            {stats.achievements.length > 0 ? (
              <ul className="journey-achievements">
                {stats.achievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            ) : (
              <p>Пока пусто. Первый ответ уже откроет достижение.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
