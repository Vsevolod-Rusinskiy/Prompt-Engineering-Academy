import { z } from 'zod';

const activityPlanBaseSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  description: z.string().min(1).optional(),
  hint: z.string().min(1).optional(),
  masteryTags: z.array(z.string().min(1)).min(1).max(5),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

const multipleChoicePlanSchema = activityPlanBaseSchema.extend({
  type: z.literal('multiple-choice'),
  allowMultiple: z.boolean(),
  options: z.array(optionSchema).min(3).max(5),
  correctOptionIds: z.array(z.string().min(1)).min(1).max(3),
});

const trueFalsePlanSchema = activityPlanBaseSchema.extend({
  type: z.literal('true-false'),
  statement: z.string().min(1),
  correctAnswer: z.boolean(),
});

const fillTheBlankPlanSchema = activityPlanBaseSchema.extend({
  type: z.literal('fill-the-blank'),
  sentence: z.string().min(1),
  placeholder: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1).max(4),
});

const matchPairsPlanSchema = activityPlanBaseSchema.extend({
  type: z.literal('match-pairs'),
  pairs: z
    .array(
      z.object({
        left: z.string().min(1),
        right: z.string().min(1),
      }),
    )
    .min(3)
    .max(5),
  rightOptions: z.array(z.string().min(1)).min(3).max(6),
});

const orderStepsPlanSchema = activityPlanBaseSchema.extend({
  type: z.literal('order-steps'),
  steps: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
      }),
    )
    .min(3)
    .max(5),
  initialOrder: z.array(z.string().min(1)).min(3).max(5),
});

const openResponsePlanBaseSchema = activityPlanBaseSchema.extend({
  evaluationRubric: z.array(z.string().min(1)).min(2).max(5),
  expectedConcepts: z.array(z.string().min(1)).min(2).max(5),
  idealAnswer: z.string().min(1),
  minLength: z.number().int().positive().max(500).optional(),
});

const freeResponsePlanSchema = openResponsePlanBaseSchema.extend({
  type: z.literal('free-response'),
});

const teachBackPlanSchema = openResponsePlanBaseSchema.extend({
  type: z.literal('teach-back'),
  targetAudience: z.string().min(1),
});

const sourceAnchorPlanSchema = openResponsePlanBaseSchema.extend({
  type: z.literal('source-anchor'),
  sourceExcerpt: z.string().min(1),
  anchorPrompt: z.string().min(1),
});

const objectiveActivityPlanSchema = z.discriminatedUnion('type', [
  multipleChoicePlanSchema,
  trueFalsePlanSchema,
  fillTheBlankPlanSchema,
]);

const relationActivityPlanSchema = z.discriminatedUnion('type', [
  matchPairsPlanSchema,
  orderStepsPlanSchema,
]);

const checkpointOneSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  narrativeBeat: z.string().min(1).optional(),
  activities: z.tuple([objectiveActivityPlanSchema, objectiveActivityPlanSchema]),
});

const checkpointTwoSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  narrativeBeat: z.string().min(1).optional(),
  activities: z.tuple([relationActivityPlanSchema, freeResponsePlanSchema]),
});

const checkpointThreeSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  narrativeBeat: z.string().min(1).optional(),
  activities: z.tuple([teachBackPlanSchema, sourceAnchorPlanSchema]),
});

export const generatedJourneyPlanSchema = z.object({
  title: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceSummary: z.string().min(1),
  checkpoints: z.tuple([
    checkpointOneSchema,
    checkpointTwoSchema,
    checkpointThreeSchema,
  ]),
});

export const openResponseEvaluationSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string().min(1),
  hint: z.string().min(1).optional(),
  strengths: z.array(z.string().min(1)).max(4),
  gaps: z.array(z.string().min(1)).max(4),
});

export const reportNarrativeSchema = z.object({
  masteredConcepts: z.array(z.string().min(1)).max(8),
  weakConcepts: z.array(z.string().min(1)).max(8),
  checkpointSummaries: z
    .array(
      z.object({
        highlights: z.array(z.string().min(1)).max(3),
        needsWork: z.array(z.string().min(1)).max(3),
      }),
    )
    .min(1),
  finalRecommendation: z.string().min(1),
  artifactMarkdown: z.string().min(1),
});
