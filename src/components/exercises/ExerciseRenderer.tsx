import type { ExerciseDefinition, ExerciseMode } from '../../lib/types';
import { FillTheBlankExercise } from './FillTheBlankExercise';
import { MatchPairsExercise } from './MatchPairsExercise';
import { MultipleChoiceExercise } from './MultipleChoiceExercise';
import { OrderStepsExercise } from './OrderStepsExercise';
import { PromptAuditExercise } from './PromptAuditExercise';
import { PromptBuilderExercise } from './PromptBuilderExercise';
import { TrueFalseExercise } from './TrueFalseExercise';

interface ExerciseRendererProps {
  exercise: ExerciseDefinition;
  mode: ExerciseMode;
  index?: number;
}

export function ExerciseRenderer({
  exercise,
  mode,
  index,
}: ExerciseRendererProps) {
  switch (exercise.type) {
    case 'multiple-choice':
      return <MultipleChoiceExercise exercise={exercise} index={index} mode={mode} />;
    case 'true-false':
      return <TrueFalseExercise exercise={exercise} index={index} mode={mode} />;
    case 'fill-the-blank':
      return <FillTheBlankExercise exercise={exercise} index={index} mode={mode} />;
    case 'match-pairs':
      return <MatchPairsExercise exercise={exercise} index={index} mode={mode} />;
    case 'order-steps':
      return <OrderStepsExercise exercise={exercise} index={index} mode={mode} />;
    case 'prompt-builder':
      return <PromptBuilderExercise exercise={exercise} index={index} mode={mode} />;
    case 'prompt-audit':
      return <PromptAuditExercise exercise={exercise} index={index} mode={mode} />;
    default:
      return null;
  }
}
