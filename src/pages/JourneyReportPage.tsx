import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NextStudyRecommendation } from '../components/personalization/NextStudyRecommendation';
import {
  clearJourneySession,
  getJourneyStats,
  readJourneySession,
} from '../lib/journey-session';
import { recordJourneyReport } from '../lib/user-context';

export function JourneyReportPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => readJourneySession());
  const reportStorageKey = useMemo(() => {
    if (!session?.report) {
      return null;
    }

    return `journey-report-recorded:${session.journey.id}:${session.report.totalScore}:${session.report.percent}`;
  }, [session]);

  useEffect(() => {
    if (!session?.report || !reportStorageKey) {
      return;
    }

    if (window.sessionStorage.getItem(reportStorageKey)) {
      return;
    }

    recordJourneyReport({
      completedAt: new Date().toISOString(),
      score: session.report.totalScore,
      masteredConcepts: session.report.masteredConcepts,
      weakConcepts: session.report.weakConcepts,
    });
    window.sessionStorage.setItem(reportStorageKey, 'true');
  }, [reportStorageKey, session]);

  if (!session?.report) {
    return (
      <div className="not-found">
        <p className="eyebrow">Report</p>
        <h1>Отчёт ещё не собран.</h1>
        <Link className="button button--primary" to="/journey">
          Вернуться к генерации
        </Link>
      </div>
    );
  }

  const stats = getJourneyStats(session);

  function handleRestart() {
    clearJourneySession();
    setSession(null);
    navigate('/journey');
  }

  return (
    <div className="journey-page">
      <section className="quiz-page__intro">
        <div>
          <p className="eyebrow">Финальная сводка</p>
          <h1>{session.journey.title}</h1>
          <p>{session.report.finalRecommendation}</p>
        </div>
        <div className="quiz-page__meta">
          <p>
            Итог: {session.report.percent}% ({session.report.totalScore.toFixed(1)} /{' '}
            {session.report.maxScore})
          </p>
          <p>XP: {stats.totalXp}</p>
        </div>
      </section>

      <div className="journey-grid">
        <div className="journey-main">
          <div className="article-cards">
            <article className="article-card">
              <p className="eyebrow">Сильные зоны</p>
              <h3>Mastered</h3>
              {session.report.masteredConcepts.length > 0 ? (
                <ul className="journey-achievements">
                  {session.report.masteredConcepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              ) : (
                <p>Пока явно не выделены.</p>
              )}
            </article>

            <article className="article-card">
              <p className="eyebrow">Зоны роста</p>
              <h3>Needs Work</h3>
              {session.report.weakConcepts.length > 0 ? (
                <ul className="journey-achievements">
                  {session.report.weakConcepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              ) : (
                <p>Критичных слабых зон не найдено.</p>
              )}
            </article>
          </div>

          <section className="article-content">
            {session.report.checkpointSummaries.map((summary) => (
              <article className="article-section" key={summary.checkpointId}>
                <p className="eyebrow">{summary.mastered ? 'Mastered' : 'Partial'}</p>
                <h2>{summary.title}</h2>
                <p>
                  Баллы: {summary.score.toFixed(1)} / {summary.maxScore}
                </p>
                <p>
                  Сильное: {summary.highlights.join('; ') || 'Недостаточно данных.'}
                </p>
                <p>
                  Подтянуть: {summary.needsWork.join('; ') || 'Критичных пробелов нет.'}
                </p>
              </article>
            ))}

            <article className="article-section">
              <p className="eyebrow">Артефакт</p>
              <h2>Итоговый документ</h2>
              <pre className="journey-artifact">{session.report.artifactMarkdown}</pre>
            </article>

            <NextStudyRecommendation />
          </section>
        </div>

        <aside className="journey-sidebar">
          <section className="summary-card">
            <p className="eyebrow">Геймификация</p>
            <p>XP: {stats.totalXp}</p>
            <p>Longest streak: {stats.longestStreak}</p>
            <p>Ответов: {stats.answeredActivities}</p>
          </section>

          <section className="summary-card">
            <p className="eyebrow">Achievements</p>
            <ul className="journey-achievements">
              {stats.achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
          </section>

          <section className="summary-card journey-form__actions">
            <button className="button button--primary" onClick={handleRestart} type="button">
              Новый journey
            </button>
            <Link className="button button--ghost" to="/journey/run">
              Назад к прохождению
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
