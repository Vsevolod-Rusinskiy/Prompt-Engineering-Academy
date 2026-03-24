import { useState } from 'react';
import { evaluateOrderSteps } from '../../lib/evaluation';
import type { ExerciseMode, OrderStepsExerciseDefinition } from '../../lib/types';
import { useExerciseController } from '../../hooks/useExerciseController';
import { ExerciseFrame } from './ExerciseFrame';

interface OrderStepsExerciseProps {
  exercise: OrderStepsExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function OrderStepsExercise({
  exercise,
  mode,
  index,
}: OrderStepsExerciseProps) {
  const [order, setOrder] = useState(exercise.initialOrder);
  const { result, submit, reset } = useExerciseController(exercise, mode);
  const labels = Object.fromEntries(exercise.steps.map((step) => [step.id, step.label]));

  function moveStep(indexToMove: number, direction: -1 | 1) {
    const nextIndex = indexToMove + direction;

    if (nextIndex < 0 || nextIndex >= order.length) {
      return;
    }

    setOrder((current) => {
      const next = [...current];
      [next[indexToMove], next[nextIndex]] = [next[nextIndex], next[indexToMove]];
      return next;
    });
  }

  function handleReset() {
    setOrder(exercise.initialOrder);
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={true}
      onCheck={() => submit(evaluateOrderSteps(exercise, order))}
      onReset={handleReset}
      index={index}
    >
      <ol className="step-list">
        {order.map((stepId, currentIndex) => (
          <li className="step-card" key={stepId}>
            <span className="step-card__index">{currentIndex + 1}</span>
            <span className="step-card__label">{labels[stepId]}</span>
            <div className="step-card__actions">
              <button
                className="button button--ghost"
                onClick={() => moveStep(currentIndex, -1)}
                type="button"
              >
                Вверх
              </button>
              <button
                className="button button--ghost"
                onClick={() => moveStep(currentIndex, 1)}
                type="button"
              >
                Вниз
              </button>
            </div>
          </li>
        ))}
      </ol>
    </ExerciseFrame>
  );
}
