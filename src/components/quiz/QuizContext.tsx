import { createContext, useContext, useState, type ReactNode } from 'react';
import { buildQuizSummary } from '../../lib/evaluation';
import type {
  ExerciseDefinition,
  ExerciseResult,
  QuizSessionState,
} from '../../lib/types';

interface QuizContextValue extends QuizSessionState {
  definitions: ExerciseDefinition[];
  recordResult: (result: ExerciseResult) => void;
  clearResult: (exerciseId: string) => void;
}

const QuizSessionContext = createContext<QuizContextValue | null>(null);

interface QuizSessionProviderProps {
  definitions: ExerciseDefinition[];
  children: ReactNode;
}

export function QuizSessionProvider({
  definitions,
  children,
}: QuizSessionProviderProps) {
  const [results, setResults] = useState<Record<string, ExerciseResult>>({});
  const summary = buildQuizSummary(definitions, results);

  function recordResult(result: ExerciseResult) {
    setResults((current) => ({
      ...current,
      [result.id]: result,
    }));
  }

  function clearResult(exerciseId: string) {
    setResults((current) => {
      const next = { ...current };
      delete next[exerciseId];
      return next;
    });
  }

  return (
    <QuizSessionContext.Provider
      value={{ definitions, results, summary, recordResult, clearResult }}
    >
      {children}
    </QuizSessionContext.Provider>
  );
}

export function useQuizSession() {
  const context = useContext(QuizSessionContext);

  if (!context) {
    throw new Error('Quiz session is required for quiz mode.');
  }

  return context;
}

export function useOptionalQuizSession() {
  return useContext(QuizSessionContext);
}
