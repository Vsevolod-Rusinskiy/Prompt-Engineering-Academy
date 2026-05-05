import { useEffect, useState } from 'react';
import { evaluateJourneyAttempt } from '../../lib/journey-api';
import type {
  JourneyActivity,
  JourneyAttempt,
  JourneyEvaluationStatus,
  SourceAnchorJourneyActivity,
} from '../../lib/journey';

type CardStatus = JourneyEvaluationStatus | 'idle';

const typeLabels: Record<JourneyActivity['type'], string> = {
  'multiple-choice': 'Выбор',
  'true-false': 'Да/нет',
  'fill-the-blank': 'Пропуск',
  'match-pairs': 'Соотнесение',
  'order-steps': 'Порядок',
  'free-response': 'Ответ',
  'teach-back': 'Объясни',
  'source-anchor': 'Источник',
};

const statusLabels: Record<CardStatus, string> = {
  idle: 'Не начато',
  correct: 'Верно',
  incorrect: 'Неверно',
  partial: 'Частично верно',
};

function getDefaultAnswer(activity: JourneyActivity, attempt?: JourneyAttempt) {
  if (attempt) {
    return attempt.studentAnswer;
  }

  switch (activity.type) {
    case 'multiple-choice':
      return [];
    case 'true-false':
      return null;
    case 'fill-the-blank':
      return '';
    case 'match-pairs':
      return {};
    case 'order-steps':
      return activity.initialOrder;
    case 'free-response':
    case 'teach-back':
      return '';
    case 'source-anchor':
      return {
        text: '',
        anchor: '',
      };
  }
}

function isAnswerReady(activity: JourneyActivity, answer: unknown) {
  switch (activity.type) {
    case 'multiple-choice':
      return Array.isArray(answer) && answer.length > 0;
    case 'true-false':
      return answer !== null;
    case 'fill-the-blank':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'match-pairs':
      return (
        typeof answer === 'object' &&
        answer !== null &&
        activity.pairs.every(
          (pair) => typeof (answer as Record<string, unknown>)[pair.left] === 'string',
        )
      );
    case 'order-steps':
      return Array.isArray(answer) && answer.length === activity.steps.length;
    case 'free-response':
    case 'teach-back':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'source-anchor':
      return (
        typeof answer === 'object' &&
        answer !== null &&
        typeof (answer as Record<string, unknown>).text === 'string' &&
        typeof (answer as Record<string, unknown>).anchor === 'string' &&
        ((answer as Record<string, string>).text.trim().length > 0 &&
          (answer as Record<string, string>).anchor.trim().length > 0)
      );
  }
}

function moveStep(order: string[], indexToMove: number, direction: -1 | 1) {
  const nextIndex = indexToMove + direction;

  if (nextIndex < 0 || nextIndex >= order.length) {
    return order;
  }

  const next = [...order];
  [next[indexToMove], next[nextIndex]] = [next[nextIndex], next[indexToMove]];
  return next;
}

function getSourceAnchorAnswer(answer: unknown) {
  if (
    answer &&
    typeof answer === 'object' &&
    !Array.isArray(answer) &&
    typeof (answer as Record<string, unknown>).text === 'string' &&
    typeof (answer as Record<string, unknown>).anchor === 'string'
  ) {
    return answer as { text: string; anchor: string };
  }

  return {
    text: '',
    anchor: '',
  };
}

function shouldRenderPrompt(activity: JourneyActivity) {
  if (activity.type !== 'fill-the-blank') {
    return true;
  }

  return activity.prompt.trim().toLowerCase() !== activity.sentence.trim().toLowerCase();
}

interface JourneyActivityCardProps {
  journeyId: string;
  checkpointId: string;
  activity: JourneyActivity;
  attempt?: JourneyAttempt;
  locked: boolean;
  onRecorded: (attempt: JourneyAttempt) => void;
}

export function JourneyActivityCard({
  journeyId,
  checkpointId,
  activity,
  attempt,
  locked,
  onRecorded,
}: JourneyActivityCardProps) {
  const [answer, setAnswer] = useState<unknown>(() => getDefaultAnswer(activity, attempt));
  const [startedAt] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnswer(getDefaultAnswer(activity, attempt));
    setError('');
  }, [activity, attempt]);

  const isSubmitted = Boolean(attempt);
  const status: CardStatus = attempt?.evaluation?.status ?? 'idle';
  const canSubmit = !locked && !isSubmitted && isAnswerReady(activity, answer);
  const controlsDisabled = locked || isSubmitted || isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const evaluation = await evaluateJourneyAttempt({
        journeyId,
        checkpointId,
        activity,
        studentAnswer: answer,
        elapsedSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      });

      onRecorded({
        journeyId,
        checkpointId,
        activityId: activity.id,
        activityType: activity.type,
        prompt: activity.prompt,
        masteryTags: activity.masteryTags,
        studentAnswer: answer,
        elapsedSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
        submittedAt: new Date().toISOString(),
        evaluation,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Не удалось проверить ответ.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderBody() {
    switch (activity.type) {
      case 'multiple-choice': {
        const selectedIds = Array.isArray(answer)
          ? answer.filter((value): value is string => typeof value === 'string')
          : [];

        return (
          <div className="choice-grid">
            {activity.options.map((option) => {
              const checked = selectedIds.includes(option.id);

              return (
                <label
                  className={`choice-card ${checked ? 'choice-card--selected' : ''}`}
                  key={option.id}
                >
                  <input
                    checked={checked}
                    disabled={controlsDisabled}
                    name={activity.id}
                    onChange={() => {
                      if (activity.allowMultiple) {
                        setAnswer((current: unknown) => {
                          const currentValue = Array.isArray(current)
                            ? current.filter(
                                (value): value is string => typeof value === 'string',
                              )
                            : [];

                          return currentValue.includes(option.id)
                            ? currentValue.filter((id) => id !== option.id)
                            : [...currentValue, option.id];
                        });
                        return;
                      }

                      setAnswer([option.id]);
                    }}
                    type={activity.allowMultiple ? 'checkbox' : 'radio'}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case 'true-false': {
        const selectedValue = typeof answer === 'boolean' ? answer : null;

        return (
          <div className="true-false">
            <p className="statement">{activity.statement}</p>
            <div className="true-false__actions">
              <button
                className={
                  selectedValue === true ? 'button button--selected' : 'button button--ghost'
                }
                disabled={controlsDisabled}
                onClick={() => setAnswer(true)}
                type="button"
              >
                Верно
              </button>
              <button
                className={
                  selectedValue === false ? 'button button--selected' : 'button button--ghost'
                }
                disabled={controlsDisabled}
                onClick={() => setAnswer(false)}
                type="button"
              >
                Неверно
              </button>
            </div>
          </div>
        );
      }

      case 'fill-the-blank':
        return (
          <label className="fill-blank">
            <span className="fill-blank__sentence">{activity.sentence}</span>
            <input
              className="input"
              disabled={controlsDisabled}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={activity.placeholder}
              type="text"
              value={typeof answer === 'string' ? answer : ''}
            />
          </label>
        );

      case 'match-pairs': {
        const matches =
          answer && typeof answer === 'object' && !Array.isArray(answer)
            ? (answer as Record<string, string>)
            : {};

        return (
          <div className="pair-grid">
            {activity.pairs.map((pair) => (
              <label className="pair-row" key={pair.left}>
                <span>{pair.left}</span>
                <select
                  className="input"
                  disabled={controlsDisabled}
                  onChange={(event) =>
                    setAnswer((current: unknown) => ({
                      ...(current && typeof current === 'object' ? current : {}),
                      [pair.left]: event.target.value,
                    }))
                  }
                  value={matches[pair.left] ?? ''}
                >
                  <option value="">Выбери соответствие</option>
                  {activity.rightOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        );
      }

      case 'order-steps': {
        const order = Array.isArray(answer)
          ? answer.filter((value): value is string => typeof value === 'string')
          : activity.initialOrder;
        const labels = Object.fromEntries(activity.steps.map((step) => [step.id, step.label]));

        return (
          <ol className="step-list">
            {order.map((stepId, index) => (
              <li className="step-card" key={stepId}>
                <span className="step-card__index">{index + 1}</span>
                <span className="step-card__label">{labels[stepId]}</span>
                <div className="step-card__actions">
                  <button
                    className="button button--ghost"
                    disabled={controlsDisabled}
                    onClick={() =>
                      setAnswer((current: unknown) =>
                        moveStep(
                          Array.isArray(current)
                            ? current.filter(
                                (value): value is string => typeof value === 'string',
                              )
                            : activity.initialOrder,
                          index,
                          -1,
                        ),
                      )
                    }
                    type="button"
                  >
                    Вверх
                  </button>
                  <button
                    className="button button--ghost"
                    disabled={controlsDisabled}
                    onClick={() =>
                      setAnswer((current: unknown) =>
                        moveStep(
                          Array.isArray(current)
                            ? current.filter(
                                (value): value is string => typeof value === 'string',
                              )
                            : activity.initialOrder,
                          index,
                          1,
                        ),
                      )
                    }
                    type="button"
                  >
                    Вниз
                  </button>
                </div>
              </li>
            ))}
          </ol>
        );
      }

      case 'free-response':
      case 'teach-back':
        return (
          <div className="journey-open-answer">
            {activity.type === 'teach-back' ? (
              <p>
                Целевая аудитория: <strong>{activity.targetAudience}</strong>
              </p>
            ) : null}
            <textarea
              className="input journey-textarea"
              disabled={controlsDisabled}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Напиши ответ своими словами"
              value={typeof answer === 'string' ? answer : ''}
            />
          </div>
        );

      case 'source-anchor': {
        const sourceAnchorAnswer = getSourceAnchorAnswer(answer);
        const sourceAnchorActivity = activity as SourceAnchorJourneyActivity;

        return (
          <div className="journey-open-answer">
            <div className="audit__prompt">
              <p className="audit__label">Исходный фрагмент</p>
              <blockquote>{sourceAnchorActivity.sourceExcerpt}</blockquote>
            </div>
            <textarea
              className="input journey-textarea"
              disabled={controlsDisabled}
              onChange={(event) =>
                setAnswer((current: unknown) => ({
                  ...getSourceAnchorAnswer(current),
                  text: event.target.value,
                }))
              }
              placeholder="Сформулируй свой вывод"
              value={sourceAnchorAnswer.text}
            />
            <textarea
              className="input journey-textarea journey-textarea--short"
              disabled={controlsDisabled}
              onChange={(event) =>
                setAnswer((current: unknown) => ({
                  ...getSourceAnchorAnswer(current),
                  anchor: event.target.value,
                }))
              }
              placeholder={sourceAnchorActivity.anchorPrompt}
              value={sourceAnchorAnswer.anchor}
            />
          </div>
        );
      }
    }
  }

  return (
    <article
      className={`exercise-card exercise-card--${status}`}
      data-testid={`journey-activity-${activity.id}`}
    >
      <header className="exercise-card__header">
        <div className="exercise-card__meta">
          <span className="exercise-card__type">{typeLabels[activity.type]}</span>
          <span className="exercise-card__state">{statusLabels[status]}</span>
          <span className="exercise-card__index">XP {activity.xpReward}</span>
        </div>
        <div>
          <h3>{activity.title}</h3>
          {shouldRenderPrompt(activity) ? (
            <p className="exercise-card__prompt">{activity.prompt}</p>
          ) : null}
          {activity.description ? (
            <p className="exercise-card__description">{activity.description}</p>
          ) : null}
        </div>
      </header>

      <div className="exercise-card__body">{renderBody()}</div>

      <footer className="exercise-card__footer">
        <div className="exercise-card__actions">
          <button
            className="button button--primary"
            data-testid={`journey-submit-${activity.id}`}
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting ? 'Проверяю...' : 'Проверить'}
          </button>
        </div>

        <div className={`exercise-card__feedback exercise-card__feedback--${status}`}>
          {attempt?.evaluation ? (
            <>
              <p>{attempt.evaluation.feedback}</p>
              {attempt.evaluation.strengths.length > 0 ? (
                <ul className="journey-feedback-list">
                  {attempt.evaluation.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {attempt.evaluation.gaps.length > 0 ? (
                <ul className="journey-feedback-list">
                  {attempt.evaluation.gaps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              <span className="exercise-card__score">
                XP: {attempt.evaluation.xpAwarded} / {activity.xpReward}
              </span>
            </>
          ) : locked ? (
            <p>Время этого чекпоинта закончилось. Переходи дальше.</p>
          ) : (
            <p>{activity.hint ?? 'Ответь и отправь на проверку.'}</p>
          )}
          {error ? <p className="journey-error">{error}</p> : null}
        </div>
      </footer>
    </article>
  );
}
