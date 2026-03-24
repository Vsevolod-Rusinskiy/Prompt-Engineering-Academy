export type ExerciseType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-the-blank'
  | 'match-pairs'
  | 'order-steps'
  | 'prompt-builder';

export type ExerciseMode = 'inline' | 'quiz';
export type ExerciseStatus = 'idle' | 'correct' | 'incorrect' | 'partial';
export type PromptSlot = 'role' | 'context' | 'task' | 'format';

export interface ExerciseFeedback {
  correct: string;
  incorrect: string;
  partial?: string;
  hint?: string;
}

export interface ExerciseOption {
  id: string;
  label: string;
}

export interface PairItem {
  left: string;
  right: string;
}

export interface StepItem {
  id: string;
  label: string;
}

export interface PromptBlock {
  id: string;
  label: string;
  slot: PromptSlot;
}

interface BaseExerciseDefinition {
  id: string;
  type: ExerciseType;
  title: string;
  prompt: string;
  description?: string;
  feedback: ExerciseFeedback;
}

export interface MultipleChoiceExerciseDefinition extends BaseExerciseDefinition {
  type: 'multiple-choice';
  allowMultiple: boolean;
  options: ExerciseOption[];
  correctOptionIds: string[];
}

export interface TrueFalseExerciseDefinition extends BaseExerciseDefinition {
  type: 'true-false';
  statement: string;
  correctAnswer: boolean;
}

export interface FillTheBlankExerciseDefinition extends BaseExerciseDefinition {
  type: 'fill-the-blank';
  sentence: string;
  placeholder: string;
  acceptedAnswers: string[];
}

export interface MatchPairsExerciseDefinition extends BaseExerciseDefinition {
  type: 'match-pairs';
  pairs: PairItem[];
  rightOptions: string[];
}

export interface OrderStepsExerciseDefinition extends BaseExerciseDefinition {
  type: 'order-steps';
  steps: StepItem[];
  initialOrder: string[];
}

export interface PromptBuilderExerciseDefinition extends BaseExerciseDefinition {
  type: 'prompt-builder';
  blocks: PromptBlock[];
  expectedBySlot: Record<PromptSlot, string>;
}

export type ExerciseDefinition =
  | MultipleChoiceExerciseDefinition
  | TrueFalseExerciseDefinition
  | FillTheBlankExerciseDefinition
  | MatchPairsExerciseDefinition
  | OrderStepsExerciseDefinition
  | PromptBuilderExerciseDefinition;

export interface ExerciseResult {
  id: string;
  type: ExerciseType;
  score: number;
  maxScore: number;
  answered: boolean;
  correct: boolean;
  status: ExerciseStatus;
}

export interface QuizSummary {
  totalExercises: number;
  answeredExercises: number;
  unansweredExercises: number;
  score: number;
  maxScore: number;
  percent: number;
  recommendation: string;
}

export interface QuizSessionState {
  results: Record<string, ExerciseResult>;
  summary: QuizSummary;
}

export type ArticleSection =
  | {
      kind: 'text';
      heading?: string;
      paragraphs: string[];
    }
  | {
      kind: 'exercise';
      exercise: ExerciseDefinition;
    };

export interface ArticleDefinition {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  readingTime: string;
  sections: ArticleSection[];
}
