import { z } from 'zod';

const journeySourceTypeSchema = z.enum(['topic', 'text']);
const journeyDifficultySchema = z.enum(['easy', 'medium', 'hard']);
const journeyNarrativeModeSchema = z.enum(['none', 'incident', 'startup', 'audit']);
const journeyTimePressureSchema = z.enum(['checkpoint', 'global']);

const activityBaseSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'multiple-choice',
    'true-false',
    'fill-the-blank',
    'match-pairs',
    'order-steps',
    'free-response',
    'teach-back',
    'source-anchor',
  ]),
  title: z.string().min(1),
  prompt: z.string().min(1),
  description: z.string().optional(),
  hint: z.string().optional(),
  xpReward: z.number().nonnegative(),
  maxScore: z.number().positive(),
  masteryTags: z.array(z.string()).min(1),
  estimatedSeconds: z.number().positive().optional(),
});

const multipleChoiceActivitySchema = activityBaseSchema.extend({
  type: z.literal('multiple-choice'),
  allowMultiple: z.boolean(),
  options: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
  correctOptionIds: z.array(z.string().min(1)).min(1),
});

const trueFalseActivitySchema = activityBaseSchema.extend({
  type: z.literal('true-false'),
  statement: z.string().min(1),
  correctAnswer: z.boolean(),
});

const fillTheBlankActivitySchema = activityBaseSchema.extend({
  type: z.literal('fill-the-blank'),
  sentence: z.string().min(1),
  placeholder: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
});

const matchPairsActivitySchema = activityBaseSchema.extend({
  type: z.literal('match-pairs'),
  pairs: z.array(
    z.object({
      left: z.string().min(1),
      right: z.string().min(1),
    }),
  ),
  rightOptions: z.array(z.string().min(1)).min(1),
});

const orderStepsActivitySchema = activityBaseSchema.extend({
  type: z.literal('order-steps'),
  steps: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
  initialOrder: z.array(z.string().min(1)).min(1),
});

const openResponseBaseSchema = activityBaseSchema.extend({
  evaluationRubric: z.array(z.string().min(1)).min(1),
  expectedConcepts: z.array(z.string().min(1)).min(1),
  idealAnswer: z.string().min(1),
  minLength: z.number().positive().optional(),
});

const freeResponseActivitySchema = openResponseBaseSchema.extend({
  type: z.literal('free-response'),
});

const teachBackActivitySchema = openResponseBaseSchema.extend({
  type: z.literal('teach-back'),
  targetAudience: z.string().min(1),
});

const sourceAnchorActivitySchema = openResponseBaseSchema.extend({
  type: z.literal('source-anchor'),
  sourceExcerpt: z.string().min(1),
  anchorPrompt: z.string().min(1),
});

export const journeyActivitySchema = z.discriminatedUnion('type', [
  multipleChoiceActivitySchema,
  trueFalseActivitySchema,
  fillTheBlankActivitySchema,
  matchPairsActivitySchema,
  orderStepsActivitySchema,
  freeResponseActivitySchema,
  teachBackActivitySchema,
  sourceAnchorActivitySchema,
]);

const checkpointSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  order: z.number().int().positive(),
  dependsOnCheckpointIds: z.array(z.string()),
  timerSeconds: z.number().positive().optional(),
  narrativeBeat: z.string().optional(),
  activities: z.array(journeyActivitySchema).min(1),
});

const evaluationSchema = z.object({
  score: z.number().min(0).max(1),
  status: z.enum(['correct', 'incorrect', 'partial']),
  passed: z.boolean(),
  feedback: z.string().min(1),
  hint: z.string().optional(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  xpAwarded: z.number().nonnegative(),
});

export const knowledgeJourneySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceType: journeySourceTypeSchema,
  sourceTitle: z.string().min(1),
  sourceSummary: z.string().min(1),
  sourceText: z.string().optional(),
  difficulty: journeyDifficultySchema,
  narrativeMode: journeyNarrativeModeSchema,
  timePressure: journeyTimePressureSchema,
  estimatedMinutes: z.number().positive(),
  globalTimerSeconds: z.number().positive().optional(),
  generatedAt: z.string().min(1),
  checkpoints: z.array(checkpointSchema).min(1),
});

export const generateJourneyRequestSchema = z
  .object({
    sourceType: journeySourceTypeSchema,
    topic: z.string().trim().optional(),
    sourceText: z.string().trim().optional(),
    difficulty: journeyDifficultySchema,
    narrativeMode: journeyNarrativeModeSchema,
    timePressure: journeyTimePressureSchema,
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === 'topic' && !value.topic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'topic is required when sourceType is "topic"',
        path: ['topic'],
      });
    }

    if (value.sourceType === 'text' && !value.sourceText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sourceText is required when sourceType is "text"',
        path: ['sourceText'],
      });
    }
  });

export const evaluateAttemptRequestSchema = z.object({
  journeyId: z.string().min(1),
  checkpointId: z.string().min(1),
  activity: journeyActivitySchema,
  studentAnswer: z.unknown(),
  elapsedSeconds: z.number().min(0),
});

export const journeyAttemptSchema = z.object({
  journeyId: z.string().min(1),
  checkpointId: z.string().min(1),
  activityId: z.string().min(1),
  activityType: activityBaseSchema.shape.type,
  prompt: z.string().min(1),
  masteryTags: z.array(z.string()),
  studentAnswer: z.unknown(),
  elapsedSeconds: z.number().min(0),
  submittedAt: z.string().min(1),
  evaluation: evaluationSchema.optional(),
});

export const buildReportRequestSchema = z.object({
  journey: knowledgeJourneySchema,
  attempts: z.array(journeyAttemptSchema),
});
