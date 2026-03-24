import { useState } from 'react';
import { evaluateTrueFalse } from '../../lib/evaluation';
import type { ExerciseMode, TrueFalseExerciseDefinition } from '../../lib/types';
import { useExerciseController } from '../../hooks/useExerciseController';
import { ExerciseFrame } from './ExerciseFrame';

interface TrueFalseExerciseProps {
  exercise: TrueFalseExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function TrueFalseExercise({
  exercise,
  mode,
  index,
}: TrueFalseExerciseProps) {
  const [selectedValue, setSelectedValue] = useState<boolean | null>(null);
  const { result, submit, reset } = useExerciseController(exercise, mode);

  function handleReset() {
    setSelectedValue(null);
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={selectedValue !== null}
      onCheck={() => submit(evaluateTrueFalse(exercise, Boolean(selectedValue)))}
      onReset={handleReset}
      index={index}
    >
      <div className="true-false">
        <p className="statement">{exercise.statement}</p>
        <div className="true-false__actions">
          <button
            className={selectedValue === true ? 'button button--selected' : 'button button--ghost'}
            onClick={() => setSelectedValue(true)}
            type="button"
          >
            Верно
          </button>
          <button
            className={
              selectedValue === false ? 'button button--selected' : 'button button--ghost'
            }
            onClick={() => setSelectedValue(false)}
            type="button"
          >
            Неверно
          </button>
        </div>
      </div>
    </ExerciseFrame>
  );
}
