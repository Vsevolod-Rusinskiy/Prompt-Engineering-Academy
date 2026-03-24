import type { QuizSummary } from '../../lib/types';

interface QuizProgressProps {
  summary: QuizSummary;
}

export function QuizProgress({ summary }: QuizProgressProps) {
  const progress =
    summary.totalExercises === 0
      ? 0
      : Math.round((summary.answeredExercises / summary.totalExercises) * 100);

  return (
    <section className="quiz-progress" aria-label="Прогресс теста">
      <div className="quiz-progress__header">
        <div>
          <p className="eyebrow">Тест-режим</p>
          <h2>Прогресс по заданиям</h2>
        </div>
        <p className="quiz-progress__numbers" data-testid="quiz-progress-copy">
          {summary.answeredExercises} из {summary.totalExercises}
        </p>
      </div>
      <div
        className="quiz-progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={summary.totalExercises}
        aria-valuenow={summary.answeredExercises}
      >
        <div
          className="quiz-progress__fill"
          data-testid="quiz-progress-value"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="quiz-progress__caption">
        Текущий результат: {summary.percent}% ({summary.score.toFixed(1)} из{' '}
        {summary.maxScore})
      </p>
    </section>
  );
}
