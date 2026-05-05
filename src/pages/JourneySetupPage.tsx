import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { generateJourney } from '../lib/journey-api';
import { clearJourneySession, readJourneySession, writeJourneySession } from '../lib/journey-session';
import type {
  JourneyDifficulty,
  JourneyNarrativeMode,
  JourneySourceType,
  JourneyTimePressure,
  KnowledgeJourneySession,
} from '../lib/journey';

export function JourneySetupPage() {
  const navigate = useNavigate();
  const [existingSession, setExistingSession] = useState(() => readJourneySession());
  const [sourceType, setSourceType] = useState<JourneySourceType>('topic');
  const [topic, setTopic] = useState('проектирование систем');
  const [sourceText, setSourceText] = useState('');
  const [difficulty, setDifficulty] = useState<JourneyDifficulty>('medium');
  const [narrativeMode, setNarrativeMode] = useState<JourneyNarrativeMode>('none');
  const [timePressure, setTimePressure] = useState<JourneyTimePressure>('checkpoint');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    sourceType === 'topic' ? topic.trim().length > 0 : sourceText.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const journey = await generateJourney({
        sourceType,
        topic: sourceType === 'topic' ? topic.trim() : undefined,
        sourceText: sourceType === 'text' ? sourceText.trim() : undefined,
        difficulty,
        narrativeMode,
        timePressure,
      });

      const nextSession: KnowledgeJourneySession = {
        journey,
        attempts: [],
        currentCheckpointIndex: 0,
        checkpointStartedAt: null,
        startedAt: new Date().toISOString(),
      };

      writeJourneySession(nextSession);
      navigate('/journey/run');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось сгенерировать journey.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleResetExisting() {
    clearJourneySession();
    setExistingSession(null);
  }

  return (
    <div className="journey-page">
      <section className="quiz-page__intro">
        <div>
          <p className="eyebrow">Knowledge Journey</p>
          <h1>Собрать маршрут обучения из темы или текста.</h1>
          <p>
            Минимальный режим: вводишь тему или вставляешь материал, система строит
            3 чекпоинта, после прохождения отдаёт отчёт.
          </p>
        </div>
        <div className="quiz-page__meta">
          <p>Сценарий: 3 чекпоинта</p>
          <p>Таймер: на чекпоинт</p>
        </div>
      </section>

      <div className="journey-grid">
        <form className="article-section journey-form" onSubmit={handleSubmit}>
          <div className="journey-form__group">
            <p className="eyebrow">Источник</p>
            <div className="true-false__actions">
              <button
                className={
                  sourceType === 'topic' ? 'button button--selected' : 'button button--ghost'
                }
                onClick={() => setSourceType('topic')}
                type="button"
              >
                Тема
              </button>
              <button
                className={
                  sourceType === 'text' ? 'button button--selected' : 'button button--ghost'
                }
                onClick={() => setSourceType('text')}
                type="button"
              >
                Текст
              </button>
            </div>
          </div>

          {sourceType === 'topic' ? (
            <label className="journey-form__group">
              <span>Тема</span>
              <input
                className="input"
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Например: gradient descent"
                type="text"
                value={topic}
              />
            </label>
          ) : (
            <label className="journey-form__group">
              <span>Материал</span>
              <textarea
                className="input journey-textarea"
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Вставь учебный текст"
                value={sourceText}
              />
            </label>
          )}

          <div className="journey-form__split">
            <label>
              <span>Сложность</span>
              <select
                className="input"
                onChange={(event) => setDifficulty(event.target.value as JourneyDifficulty)}
                value={difficulty}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label>
              <span>Нарратив</span>
              <select
                className="input"
                onChange={(event) =>
                  setNarrativeMode(event.target.value as JourneyNarrativeMode)
                }
                value={narrativeMode}
              >
                <option value="none">None</option>
                <option value="incident">Incident</option>
                <option value="startup">Startup</option>
                <option value="audit">Audit</option>
              </select>
            </label>

            <label>
              <span>Таймер</span>
              <select
                className="input"
                onChange={(event) =>
                  setTimePressure(event.target.value as JourneyTimePressure)
                }
                value={timePressure}
              >
                <option value="checkpoint">На чекпоинт</option>
                <option value="global">Общий</option>
              </select>
            </label>
          </div>

          <div className="journey-form__actions">
            <button
              className="button button--primary"
              disabled={!canSubmit || isGenerating}
              type="submit"
            >
              {isGenerating ? 'Генерирую...' : 'Сгенерировать journey'}
            </button>
            <Link className="button button--ghost" to="/">
              Вернуться на главную
            </Link>
          </div>

          {error ? <p className="journey-error">{error}</p> : null}
        </form>

        <aside className="summary-card journey-sidebar">
          <p className="eyebrow">Текущая сессия</p>
          {existingSession ? (
            <>
              <h2>{existingSession.journey.title}</h2>
              <p>
                Чекпоинт: {existingSession.currentCheckpointIndex + 1} из{' '}
                {existingSession.journey.checkpoints.length}
              </p>
              <p>Ответов сохранено: {existingSession.attempts.length}</p>
              <div className="journey-form__actions">
                <Link className="button button--primary" to="/journey/run">
                  Продолжить
                </Link>
                <button
                  className="button button--ghost"
                  onClick={handleResetExisting}
                  type="button"
                >
                  Сбросить
                </button>
              </div>
            </>
          ) : (
            <p>Активной journey-сессии нет. После генерации здесь появится продолжение.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
