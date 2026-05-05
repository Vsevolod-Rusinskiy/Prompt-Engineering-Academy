export type JourneySourceType = 'topic' | 'text';
export type JourneyDifficulty = 'easy' | 'medium' | 'hard';
export type JourneyNarrativeMode = 'none' | 'incident' | 'startup' | 'audit';
export type JourneyTimePressure = 'checkpoint' | 'global';

export type JourneyActivityType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-the-blank'
  | 'match-pairs'
  | 'order-steps'
  | 'free-response'
  | 'teach-back'
  | 'source-anchor';

export type JourneyEvaluationStatus = 'correct' | 'incorrect' | 'partial';

export interface JourneyGenerateRequest {
  sourceType: JourneySourceType;
  topic?: string;
  sourceText?: string;
  difficulty: JourneyDifficulty;
  narrativeMode: JourneyNarrativeMode;
  timePressure: JourneyTimePressure;
}

interface JourneyActivityBase {
  id: string;
  type: JourneyActivityType;
  title: string;
  prompt: string;
  description?: string;
  hint?: string;
  xpReward: number;
  maxScore: number;
  masteryTags: string[];
  estimatedSeconds?: number;
}

export interface JourneyOption {
  id: string;
  label: string;
}

export interface JourneyPair {
  left: string;
  right: string;
}

export interface JourneyStep {
  id: string;
  label: string;
}

export interface MultipleChoiceJourneyActivity extends JourneyActivityBase {
  type: 'multiple-choice';
  allowMultiple: boolean;
  options: JourneyOption[];
  correctOptionIds: string[];
}

export interface TrueFalseJourneyActivity extends JourneyActivityBase {
  type: 'true-false';
  statement: string;
  correctAnswer: boolean;
}

export interface FillTheBlankJourneyActivity extends JourneyActivityBase {
  type: 'fill-the-blank';
  sentence: string;
  placeholder: string;
  acceptedAnswers: string[];
}

export interface MatchPairsJourneyActivity extends JourneyActivityBase {
  type: 'match-pairs';
  pairs: JourneyPair[];
  rightOptions: string[];
}

export interface OrderStepsJourneyActivity extends JourneyActivityBase {
  type: 'order-steps';
  steps: JourneyStep[];
  initialOrder: string[];
}

interface OpenResponseJourneyActivityBase extends JourneyActivityBase {
  evaluationRubric: string[];
  expectedConcepts: string[];
  idealAnswer: string;
  minLength?: number;
}

export interface FreeResponseJourneyActivity
  extends OpenResponseJourneyActivityBase {
  type: 'free-response';
}

export interface TeachBackJourneyActivity
  extends OpenResponseJourneyActivityBase {
  type: 'teach-back';
  targetAudience: string;
}

export interface SourceAnchorJourneyActivity
  extends OpenResponseJourneyActivityBase {
  type: 'source-anchor';
  sourceExcerpt: string;
  anchorPrompt: string;
}

export type JourneyActivity =
  | MultipleChoiceJourneyActivity
  | TrueFalseJourneyActivity
  | FillTheBlankJourneyActivity
  | MatchPairsJourneyActivity
  | OrderStepsJourneyActivity
  | FreeResponseJourneyActivity
  | TeachBackJourneyActivity
  | SourceAnchorJourneyActivity;

export interface JourneyCheckpoint {
  id: string;
  title: string;
  goal: string;
  order: number;
  dependsOnCheckpointIds: string[];
  timerSeconds?: number;
  narrativeBeat?: string;
  activities: JourneyActivity[];
}

export interface KnowledgeJourney {
  id: string;
  title: string;
  sourceType: JourneySourceType;
  sourceTitle: string;
  sourceSummary: string;
  sourceText?: string;
  difficulty: JourneyDifficulty;
  narrativeMode: JourneyNarrativeMode;
  timePressure: JourneyTimePressure;
  estimatedMinutes: number;
  globalTimerSeconds?: number;
  generatedAt: string;
  checkpoints: JourneyCheckpoint[];
}

export interface JourneyGenerateResponse {
  journey: KnowledgeJourney;
}

export interface ActivityEvaluation {
  score: number;
  status: JourneyEvaluationStatus;
  passed: boolean;
  feedback: string;
  hint?: string;
  strengths: string[];
  gaps: string[];
  xpAwarded: number;
}

export interface EvaluateAttemptRequest {
  journeyId: string;
  checkpointId: string;
  activity: JourneyActivity;
  studentAnswer: unknown;
  elapsedSeconds: number;
}

export interface EvaluateAttemptResponse {
  evaluation: ActivityEvaluation;
}

export interface JourneyAttempt {
  journeyId: string;
  checkpointId: string;
  activityId: string;
  activityType: JourneyActivityType;
  prompt: string;
  masteryTags: string[];
  studentAnswer: unknown;
  elapsedSeconds: number;
  submittedAt: string;
  evaluation?: ActivityEvaluation;
}

export interface JourneyCheckpointReportSummary {
  checkpointId: string;
  title: string;
  score: number;
  maxScore: number;
  mastered: boolean;
  highlights: string[];
  needsWork: string[];
}

export interface JourneyReport {
  totalScore: number;
  maxScore: number;
  percent: number;
  masteredConcepts: string[];
  weakConcepts: string[];
  checkpointSummaries: JourneyCheckpointReportSummary[];
  finalRecommendation: string;
  artifactMarkdown: string;
}

export interface BuildReportRequest {
  journey: KnowledgeJourney;
  attempts: JourneyAttempt[];
}

export interface BuildReportResponse {
  report: JourneyReport;
}

export interface KnowledgeJourneySession {
  journey: KnowledgeJourney;
  attempts: JourneyAttempt[];
  currentCheckpointIndex: number;
  checkpointStartedAt: string | null;
  startedAt: string;
  report?: JourneyReport;
}
