import { useState } from 'react';
import { evaluateFillTheBlank } from '../../lib/evaluation';
import type { ExerciseMode, FillTheBlankExerciseDefinition } from '../../lib/types';
import { useExerciseController } from '../../hooks/useExerciseController';
import { ExerciseFrame } from './ExerciseFrame';

interface FillTheBlankExerciseProps {
  exercise: FillTheBlankExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function FillTheBlankExercise({
  exercise,
  mode,
  index,
}: FillTheBlankExerciseProps) {
  const [value, setValue] = useState('');
  const { result, submit, reset } = useExerciseController(exercise, mode);

  function handleReset() {
    setValue('');
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={value.trim().length > 0}
      onCheck={() => submit(evaluateFillTheBlank(exercise, value))}
      onReset={handleReset}
      index={index}
    >
      <label className="fill-blank">
        <span className="fill-blank__sentence">
          {exercise.sentence.replace('____', '_____')}
        </span>
        <input
          className="input"
          onChange={(event) => setValue(event.target.value)}
          placeholder={exercise.placeholder}
          type="text"
          value={value}
        />
      </label>
    </ExerciseFrame>
  );
}
