import { useState } from 'react';
import { evaluatePromptBuilder } from '../../lib/evaluation';
import type {
  ExerciseMode,
  PromptBuilderExerciseDefinition,
  PromptSlot,
} from '../../lib/types';
import { useExerciseController } from '../../hooks/useExerciseController';
import { ExerciseFrame } from './ExerciseFrame';

const slotLabels: Record<PromptSlot, string> = {
  role: 'Роль',
  context: 'Контекст',
  task: 'Задача',
  format: 'Формат',
};

interface PromptBuilderExerciseProps {
  exercise: PromptBuilderExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function PromptBuilderExercise({
  exercise,
  mode,
  index,
}: PromptBuilderExerciseProps) {
  const [assignments, setAssignments] = useState<Record<PromptSlot, string>>({
    role: '',
    context: '',
    task: '',
    format: '',
  });
  const [activeSlot, setActiveSlot] = useState<PromptSlot>('role');
  const { result, submit, reset } = useExerciseController(exercise, mode);
  const blocksById = Object.fromEntries(exercise.blocks.map((block) => [block.id, block]));

  function assignBlock(blockId: string) {
    setAssignments((current) => {
      const next: Record<PromptSlot, string> = { ...current };

      (Object.keys(next) as PromptSlot[]).forEach((slot) => {
        if (next[slot] === blockId) {
          next[slot] = '';
        }
      });

      next[activeSlot] = blockId;
      return next;
    });
  }

  function clearSlot(slot: PromptSlot) {
    setAssignments((current) => ({
      ...current,
      [slot]: '',
    }));
  }

  function handleReset() {
    setAssignments({
      role: '',
      context: '',
      task: '',
      format: '',
    });
    setActiveSlot('role');
    reset();
  }

  return (
    <ExerciseFrame
      exercise={exercise}
      mode={mode}
      result={result}
      canSubmit={Object.values(assignments).some(Boolean)}
      onCheck={() => submit(evaluatePromptBuilder(exercise, assignments))}
      onReset={handleReset}
      index={index}
    >
      <div className="builder">
        <div className="builder__slots">
          {(Object.keys(slotLabels) as PromptSlot[]).map((slot) => {
            const blockId = assignments[slot];
            const block = blockId ? blocksById[blockId] : null;

            return (
              <div
                className={`builder-slot ${activeSlot === slot ? 'builder-slot--active' : ''}`}
                data-testid={`builder-slot-${exercise.id}-${slot}`}
                key={slot}
              >
                <button
                  className="builder-slot__header"
                  data-testid={`builder-slot-button-${exercise.id}-${slot}`}
                  onClick={() => setActiveSlot(slot)}
                  type="button"
                >
                  <span>{slotLabels[slot]}</span>
                  <strong>{block ? 'Заполнено' : 'Пусто'}</strong>
                </button>
                <div className="builder-slot__body">
                  <p>{block ? block.label : 'Выбери слот, затем кликни по нужному блоку ниже.'}</p>
                  {block ? (
                    <button
                      className="button button--ghost"
                      onClick={() => clearSlot(slot)}
                      type="button"
                    >
                      Очистить слот
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="builder__blocks">
          <p className="builder__help">
            Активный слот: <strong>{slotLabels[activeSlot]}</strong>
          </p>
          <div className="builder__block-list">
            {exercise.blocks.map((block) => {
              const isAssigned = Object.values(assignments).includes(block.id);

              return (
                <button
                  className={`builder-block ${isAssigned ? 'builder-block--used' : ''}`}
                  data-testid={`builder-block-${exercise.id}-${block.id}`}
                  key={block.id}
                  onClick={() => assignBlock(block.id)}
                  type="button"
                >
                  <span className="builder-block__tag">{slotLabels[block.slot]}</span>
                  <span>{block.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ExerciseFrame>
  );
}
