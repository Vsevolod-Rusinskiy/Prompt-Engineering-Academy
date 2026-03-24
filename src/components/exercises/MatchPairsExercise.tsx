import { useState } from 'react';
import { evaluateMatchPairs } from '../../lib/evaluation';
import type { ExerciseMode, MatchPairsExerciseDefinition } from '../../lib/types';
import { useExerciseController } from '../../hooks/useExerciseController';
import { ExerciseFrame } from './ExerciseFrame';

interface MatchPairsExerciseProps {
  exercise: MatchPairsExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function MatchPairsExercise({
  exercise,
  mode,
  index,
}: MatchPairsExerciseProps) {
  const [matches, setMatches] = useState<Record<string, string>>({});
  const { result, submit, reset } = useExerciseController(exercise, mode);

  function handleReset() {
    setMatches({});
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={Object.values(matches).some(Boolean)}
      onCheck={() => submit(evaluateMatchPairs(exercise, matches))}
      onReset={handleReset}
      index={index}
    >
      <div className="pair-grid">
        {exercise.pairs.map((pair) => (
          <label className="pair-row" key={pair.left}>
            <span>{pair.left}</span>
            <select
              className="input"
              value={matches[pair.left] ?? ''}
              onChange={(event) =>
                setMatches((current) => ({
                  ...current,
                  [pair.left]: event.target.value,
                }))
              }
            >
              <option value="">Выбери соответствие</option>
              {exercise.rightOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </ExerciseFrame>
  );
}
