import { useState } from 'react';
import { evaluateMultipleChoice } from '../../lib/evaluation';
import type { ExerciseMode, MultipleChoiceExerciseDefinition } from '../../lib/types';
import { useExerciseController } from '../../hooks/useExerciseController';
import { ExerciseFrame } from './ExerciseFrame';

interface MultipleChoiceExerciseProps {
  exercise: MultipleChoiceExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function MultipleChoiceExercise({
  exercise,
  mode,
  index,
}: MultipleChoiceExerciseProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { result, submit, reset } = useExerciseController(exercise, mode);

  function toggleOption(optionId: string) {
    if (exercise.allowMultiple) {
      setSelectedIds((current) =>
        current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      );
      return;
    }

    setSelectedIds([optionId]);
  }

  function handleReset() {
    setSelectedIds([]);
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={selectedIds.length > 0}
      onCheck={() => submit(evaluateMultipleChoice(exercise, selectedIds))}
      onReset={handleReset}
      index={index}
    >
      <div className="choice-grid">
        {exercise.options.map((option) => {
          const checked = selectedIds.includes(option.id);

          return (
            <label
              className={`choice-card ${checked ? 'choice-card--selected' : ''}`}
              key={option.id}
            >
              <input
                checked={checked}
                name={exercise.id}
                onChange={() => toggleOption(option.id)}
                type={exercise.allowMultiple ? 'checkbox' : 'radio'}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </ExerciseFrame>
  );
}
