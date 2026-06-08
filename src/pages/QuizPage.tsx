import { useState } from 'react';
import { ExerciseRenderer } from '../components/exercises/ExerciseRenderer';
import { QuizProgress } from '../components/quiz/QuizProgress';
import { QuizSessionProvider, useQuizSession } from '../components/quiz/QuizContext';
import { NextStudyRecommendation } from '../components/personalization/NextStudyRecommendation';
import { quizExercises } from '../content/quiz';
import { recordQuizAttempt } from '../lib/user-context';

function QuizPageContent() {
  const [showSummary, setShowSummary] = useState(false);
  const { summary } = useQuizSession();

  function handleFinishQuiz() {
    setShowSummary(true);
    recordQuizAttempt({
      completedAt: new Date().toISOString(),
      score: summary.score,
      total: summary.maxScore,
      percentage: summary.percent,
      recommendation: summary.recommendation,
    });
  }

  return (
    <div className="quiz-page">
      <section className="quiz-page__intro">
        <div>
          <p className="eyebrow">Финальная проверка</p>
          <h1>Итоговый тест по основам prompt engineering</h1>
          <p>
            Здесь компоненты работают в тест-режиме: каждый ответ уходит в общий
            подсчёт, прогресс обновляется по мере прохождения, а в конце появляется
            краткая рекомендация по следующему шагу.
          </p>
        </div>
        <div className="quiz-page__meta">
          <p>Всего вопросов: {summary.totalExercises}</p>
          <p>Типы: 6 форматов заданий</p>
        </div>
      </section>

      <QuizProgress summary={summary} />

      <section className="quiz-list">
        {quizExercises.map((exercise, index) => (
          <ExerciseRenderer exercise={exercise} index={index} key={exercise.id} mode="quiz" />
        ))}
      </section>

      <section className="quiz-summary-panel">
        <button
          className="button button--primary"
          onClick={handleFinishQuiz}
          type="button"
        >
          Завершить тест
        </button>

        {showSummary ? (
          <div className="summary-card" data-testid="quiz-summary">
            <p className="eyebrow">Результат</p>
            <h2>{summary.percent}% правильности</h2>
            <p>
              Отвечено: {summary.answeredExercises} из {summary.totalExercises}. Неотвеченных
              вопросов: {summary.unansweredExercises}.
            </p>
            <p>
              Баллы: {summary.score.toFixed(1)} / {summary.maxScore}
            </p>
            <p>{summary.recommendation}</p>
          </div>
        ) : null}

        {showSummary ? <NextStudyRecommendation /> : null}
      </section>
    </div>
  );
}

export function QuizPage() {
  return (
    <QuizSessionProvider definitions={quizExercises}>
      <QuizPageContent />
    </QuizSessionProvider>
  );
}
