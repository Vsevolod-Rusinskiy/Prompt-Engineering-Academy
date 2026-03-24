import type {
  ExerciseDefinition,
  ExerciseMode,
  ExerciseResult,
} from '../../lib/types';
import { getFeedbackMessage } from '../../lib/evaluation';

const typeLabels: Record<ExerciseDefinition['type'], string> = {
  'multiple-choice': 'MultipleChoice',
  'true-false': 'TrueFalse',
  'fill-the-blank': 'FillTheBlank',
  'match-pairs': 'MatchPairs',
  'order-steps': 'OrderSteps',
  'prompt-builder': 'PromptBuilder',
};

const statusLabels = {
  idle: 'Не отвечено',
  correct: 'Верно',
  incorrect: 'Неверно',
  partial: 'Частично верно',
};

interface ExerciseFrameProps {
  exercise: ExerciseDefinition;
  mode: ExerciseMode;
  result: ExerciseResult | null;
  canSubmit: boolean;
  onCheck: () => void;
  onReset: () => void;
  index?: number;
  children: React.ReactNode;
}

export function ExerciseFrame({
  exercise,
  mode,
  result,
  canSubmit,
  onCheck,
  onReset,
  index,
  children,
}: ExerciseFrameProps) {
  const currentStatus = result?.status ?? 'idle';

  return (
    <article
      data-exercise-mode={mode}
      data-exercise-status={currentStatus}
      data-exercise-type={exercise.type}
      data-testid={`exercise-card-${exercise.id}`}
      className={`exercise-card exercise-card--${exercise.type} exercise-card--${currentStatus}`}
    >
      <header className="exercise-card__header">
        <div className="exercise-card__meta">
          <span className="exercise-card__type">{typeLabels[exercise.type]}</span>
          <span className="exercise-card__state" data-testid={`exercise-state-${exercise.id}`}>
            {statusLabels[currentStatus]}
          </span>
          {mode === 'quiz' && typeof index === 'number' ? (
            <span className="exercise-card__index">№ {index + 1}</span>
          ) : null}
        </div>
        <div>
          <h3>{exercise.title}</h3>
          <p className="exercise-card__prompt">{exercise.prompt}</p>
          {exercise.description ? (
            <p className="exercise-card__description">{exercise.description}</p>
          ) : null}
        </div>
      </header>

      <div className="exercise-card__body">{children}</div>

      <footer className="exercise-card__footer">
        <div className="exercise-card__actions">
          <button
            className="button button--primary"
            data-testid={`exercise-check-${exercise.id}`}
            onClick={onCheck}
            type="button"
            disabled={!canSubmit}
          >
            Проверить
          </button>
          <button
            className="button button--ghost"
            data-testid={`exercise-reset-${exercise.id}`}
            onClick={onReset}
            type="button"
            disabled={!result}
          >
            Сбросить
          </button>
        </div>

        <div
          className={`exercise-card__feedback exercise-card__feedback--${currentStatus}`}
          data-testid={`exercise-feedback-${exercise.id}`}
        >
          <p>{getFeedbackMessage(exercise.feedback, currentStatus)}</p>
          {mode === 'quiz' && result ? (
            <span className="exercise-card__score" data-testid={`exercise-score-${exercise.id}`}>
              Балл: {result.score.toFixed(1)} / {result.maxScore}
            </span>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
