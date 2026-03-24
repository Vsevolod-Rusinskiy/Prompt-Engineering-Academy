import { useState } from 'react';
import type { ExerciseDefinition, ExerciseMode, ExerciseResult } from '../lib/types';
import { useOptionalQuizSession } from '../components/quiz/QuizContext';

export function useExerciseController(
  exercise: ExerciseDefinition,
  mode: ExerciseMode,
) {
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const quiz = useOptionalQuizSession();

  function submit(nextResult: ExerciseResult) {
    setResult(nextResult);

    if (mode === 'quiz' && quiz) {
      quiz.recordResult(nextResult);
    }
  }

  function reset() {
    setResult(null);

    if (mode === 'quiz' && quiz) {
      quiz.clearResult(exercise.id);
    }
  }

  return { result, submit, reset };
}
