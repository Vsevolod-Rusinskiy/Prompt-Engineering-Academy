import { useState } from 'react';
import { useExerciseController } from '../../hooks/useExerciseController';
import { evaluatePromptAudit } from '../../lib/evaluation';
import type {
  ExerciseMode,
  PromptAuditDecision,
  PromptAuditExerciseDefinition,
} from '../../lib/types';
import { ExerciseFrame } from './ExerciseFrame';

interface PromptAuditExerciseProps {
  exercise: PromptAuditExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function PromptAuditExercise({
  exercise,
  mode,
  index,
}: PromptAuditExerciseProps) {
  const [answers, setAnswers] = useState<Record<string, PromptAuditDecision>>({});
  const { result, submit, reset } = useExerciseController(exercise, mode);

  function setAnswer(checkId: string, value: PromptAuditDecision) {
    setAnswers((current) => ({
      ...current,
      [checkId]: value,
    }));
  }

  function handleReset() {
    setAnswers({});
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={exercise.checks.every((check) => Boolean(answers[check.id]))}
      onCheck={() => submit(evaluatePromptAudit(exercise, answers))}
      onReset={handleReset}
      index={index}
    >
      <div className="audit">
        <div className="audit__prompt">
          <p className="audit__label">Промпт для аудита</p>
          <blockquote>{exercise.promptText}</blockquote>
        </div>

        <div className="audit__grid">
          {exercise.checks.map((check) => {
            const selectedValue = answers[check.id];

            return (
              <div className="audit-row" key={check.id}>
                <p>{check.label}</p>
                <div className="audit-row__actions">
                  <button
                    className={
                      selectedValue === 'present'
                        ? 'button button--selected'
                        : 'button button--ghost'
                    }
                    data-testid={`audit-present-${exercise.id}-${check.id}`}
                    onClick={() => setAnswer(check.id, 'present')}
                    type="button"
                  >
                    Есть
                  </button>
                  <button
                    className={
                      selectedValue === 'missing'
                        ? 'button button--selected'
                        : 'button button--ghost'
                    }
                    data-testid={`audit-missing-${exercise.id}-${check.id}`}
                    onClick={() => setAnswer(check.id, 'missing')}
                    type="button"
                  >
                    Не хватает
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ExerciseFrame>
  );
}
