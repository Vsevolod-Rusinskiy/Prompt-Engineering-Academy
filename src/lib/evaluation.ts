import {
  type ExerciseDefinition,
  type ExerciseFeedback,
  type ExerciseResult,
  type MatchPairsExerciseDefinition,
  type MultipleChoiceExerciseDefinition,
  type OrderStepsExerciseDefinition,
  type PromptBuilderExerciseDefinition,
  type PromptSlot,
  type QuizSummary,
  type TrueFalseExerciseDefinition,
  type FillTheBlankExerciseDefinition,
} from './types';

const MAX_SCORE = 1;

function clampScore(value: number) {
  if (value < 0) {
    return 0;
  }

  if (value > MAX_SCORE) {
    return MAX_SCORE;
  }

  return value;
}

function statusFromScore(score: number) {
  if (score === MAX_SCORE) {
    return 'correct' as const;
  }

  if (score === 0) {
    return 'incorrect' as const;
  }

  return 'partial' as const;
}

function buildResult(
  definition: ExerciseDefinition,
  score: number,
  answered = true,
): ExerciseResult {
  const normalized = clampScore(score);

  return {
    id: definition.id,
    type: definition.type,
    score: normalized,
    maxScore: MAX_SCORE,
    answered,
    correct: normalized === MAX_SCORE,
    status: answered ? statusFromScore(normalized) : 'idle',
  };
}

export function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function getFeedbackMessage(
  feedback: ExerciseFeedback,
  status: ExerciseResult['status'],
) {
  if (status === 'correct') {
    return feedback.correct;
  }

  if (status === 'partial') {
    return feedback.partial ?? feedback.incorrect;
  }

  if (status === 'incorrect') {
    return feedback.incorrect;
  }

  return feedback.hint ?? 'Сначала выберите или введите ответ, затем проверьте себя.';
}

export function evaluateMultipleChoice(
  definition: MultipleChoiceExerciseDefinition,
  answer: string[],
) {
  if (!definition.allowMultiple) {
    const isCorrect =
      answer.length === 1 && answer[0] === definition.correctOptionIds[0];

    return buildResult(definition, isCorrect ? MAX_SCORE : 0);
  }

  const correctIds = new Set(definition.correctOptionIds);
  const correctSelections = answer.filter((id) => correctIds.has(id)).length;
  const incorrectSelections = answer.filter((id) => !correctIds.has(id)).length;
  const score =
    (correctSelections - incorrectSelections) / definition.correctOptionIds.length;

  return buildResult(definition, score);
}

export function evaluateTrueFalse(
  definition: TrueFalseExerciseDefinition,
  answer: boolean,
) {
  return buildResult(definition, answer === definition.correctAnswer ? 1 : 0);
}

export function evaluateFillTheBlank(
  definition: FillTheBlankExerciseDefinition,
  answer: string,
) {
  const normalizedAnswer = normalizeText(answer);
  const isCorrect = definition.acceptedAnswers
    .map(normalizeText)
    .includes(normalizedAnswer);

  return buildResult(definition, isCorrect ? 1 : 0);
}

export function evaluateMatchPairs(
  definition: MatchPairsExerciseDefinition,
  answer: Record<string, string>,
) {
  const correctCount = definition.pairs.reduce((total, pair) => {
    return total + Number(answer[pair.left] === pair.right);
  }, 0);

  return buildResult(definition, correctCount / definition.pairs.length);
}

export function evaluateOrderSteps(
  definition: OrderStepsExerciseDefinition,
  answer: string[],
) {
  const correctCount = definition.steps.reduce((total, step, index) => {
    return total + Number(answer[index] === step.id);
  }, 0);

  return buildResult(definition, correctCount / definition.steps.length);
}

export function evaluatePromptBuilder(
  definition: PromptBuilderExerciseDefinition,
  answer: Record<PromptSlot, string>,
) {
  const slots: PromptSlot[] = ['role', 'context', 'task', 'format'];
  const correctCount = slots.reduce((total, slot) => {
    return total + Number(answer[slot] === definition.expectedBySlot[slot]);
  }, 0);

  return buildResult(definition, correctCount / slots.length);
}

export function buildQuizSummary(
  definitions: ExerciseDefinition[],
  results: Record<string, ExerciseResult>,
): QuizSummary {
  const answeredExercises = Object.values(results).filter((result) => result.answered)
    .length;
  const score = Object.values(results).reduce((total, result) => total + result.score, 0);
  const totalExercises = definitions.length;
  const percent = totalExercises === 0 ? 0 : Math.round((score / totalExercises) * 100);
  const unansweredExercises = totalExercises - answeredExercises;

  let recommendation = 'Разберите ошибки и заново пройдите спорные вопросы.';

  if (percent >= 85) {
    recommendation =
      'База сильная: можно переходить к более сложным кейсам и редактированию чужих промптов.';
  } else if (percent >= 60) {
    recommendation =
      'Фундамент уже есть, но стоит отдельно потренировать проверку фактов и структуру запроса.';
  }

  return {
    totalExercises,
    answeredExercises,
    unansweredExercises,
    score,
    maxScore: totalExercises,
    percent,
    recommendation,
  };
}
