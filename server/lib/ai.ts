import { z } from 'zod';
import type {
  ActivityEvaluation,
  BuildReportRequest,
  EvaluateAttemptRequest,
  JourneyActivity,
  JourneyGenerateRequest,
  KnowledgeJourney,
} from '../../src/lib/journey';
import {
  buildAttemptEvaluationPrompt,
  buildAttemptEvaluationSystemPrompt,
  buildJourneyGenerationPrompt,
  buildJourneyGenerationSystemPrompt,
  buildReportPrompt,
  buildReportSystemPrompt,
} from './prompts';
import { buildJourneyReport, evaluateActivityAttempt } from './scoring';
import {
  generatedJourneyPlanSchema,
  openResponseEvaluationSchema,
  reportNarrativeSchema,
} from './llm-schemas';
import { isOpenAIConfigured, requestStructuredCompletion } from './openai';

function createJourneyId() {
  return `journey_${Date.now()}`;
}

function createActivityId(checkpointIndex: number, activityIndex: number) {
  return `cp${checkpointIndex + 1}_act${activityIndex + 1}`;
}

function pickSourceTitle(input: JourneyGenerateRequest) {
  if (input.sourceType === 'topic') {
    return input.topic?.trim() ?? 'Untitled topic';
  }

  const firstSentence = input.sourceText?.trim().split(/[.!?]/)[0];
  return firstSentence?.slice(0, 64) || 'Uploaded material';
}

function summarizeSource(input: JourneyGenerateRequest) {
  if (input.sourceType === 'topic') {
    return `Journey built around the topic "${input.topic?.trim()}".`;
  }

  const compact = input.sourceText?.replace(/\s+/g, ' ').trim() ?? '';
  return compact.slice(0, 220);
}

function pickExcerpt(input: JourneyGenerateRequest) {
  if (input.sourceType === 'text') {
    return input.sourceText?.replace(/\s+/g, ' ').trim().slice(0, 260) ?? '';
  }

  return `Key material about ${pickSourceTitle(input)} should be grounded in the supplied explanation, not in guesswork.`;
}

function getNarrativeBeat(
  mode: JourneyGenerateRequest['narrativeMode'],
  index: number,
  sourceTitle: string,
) {
  if (mode === 'none') {
    return undefined;
  }

  const beats = {
    incident: [
      `Канал с алертами уже шумит: сначала нужно быстро выделить, что в теме "${sourceTitle}" является базой.`,
      `Теперь решение нельзя откладывать: разложи зависимости и не перепутай причинно-следственные связи.`,
      `Финальный этап перед созвоном: объясни тему "${sourceTitle}" так, чтобы на ней можно было принимать решение.`,
    ],
    startup: [
      `Первый рабочий слот в продуктовой команде: нужно схватить базовые понятия темы "${sourceTitle}".`,
      `Следом идёт разбор кейса: выдели логику и свяжи опорные концепции.`,
      `Перед демо команде: собери компактное объяснение и покажи, что понял материал.`,
    ],
    audit: [
      `Старт проверки: отдели базовые определения темы "${sourceTitle}" от поверхностного пересказа.`,
      `Середина аудита: проверь, выдержана ли логика и можно ли на неё опереться.`,
      `Финал аудита: оформи объяснение так, чтобы им можно было пользоваться дальше.`,
    ],
  };

  return beats[mode][index];
}

function getDefaultEstimatedSeconds(type: JourneyActivity['type']) {
  switch (type) {
    case 'multiple-choice':
    case 'true-false':
    case 'fill-the-blank':
      return 90;
    case 'match-pairs':
    case 'order-steps':
      return 120;
    case 'free-response':
      return 150;
    case 'teach-back':
      return 180;
    case 'source-anchor':
      return 210;
  }
}

function getDefaultXp(type: JourneyActivity['type']) {
  switch (type) {
    case 'multiple-choice':
    case 'true-false':
    case 'fill-the-blank':
      return 20;
    case 'match-pairs':
    case 'order-steps':
      return 25;
    case 'free-response':
      return 30;
    case 'teach-back':
      return 35;
    case 'source-anchor':
      return 40;
  }
}

function normalizeMasteryTags(tags: string[], sourceTitle: string) {
  return Array.from(
    new Set(
      [sourceTitle.toLowerCase(), 'knowledge-journey', ...tags]
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

function isOpenResponseType(type: JourneyActivity['type']) {
  return type === 'free-response' || type === 'teach-back' || type === 'source-anchor';
}

function getEvaluationStatus(score: number): ActivityEvaluation['status'] {
  if (score >= 0.95) {
    return 'correct';
  }

  if (score <= 0.25) {
    return 'incorrect';
  }

  return 'partial';
}

function buildNormalizedEvaluation(
  activity: JourneyActivity,
  evaluation: z.infer<typeof openResponseEvaluationSchema>,
): ActivityEvaluation {
  const normalizedScore = Math.max(0, Math.min(1, evaluation.score));
  const status = getEvaluationStatus(normalizedScore);

  return {
    score: normalizedScore,
    status,
    passed: normalizedScore >= 0.6,
    feedback: evaluation.feedback,
    hint: evaluation.hint ?? activity.hint,
    strengths: evaluation.strengths,
    gaps: evaluation.gaps,
    xpAwarded: Math.round(activity.xpReward * normalizedScore),
  };
}

function buildBaseReportSummary(input: BuildReportRequest) {
  return JSON.stringify(
    {
      journeyTitle: input.journey.title,
      attempts: input.attempts.map((attempt) => ({
        checkpointId: attempt.checkpointId,
        activityId: attempt.activityId,
        activityType: attempt.activityType,
        score: attempt.evaluation?.score ?? null,
        strengths: attempt.evaluation?.strengths ?? [],
        gaps: attempt.evaluation?.gaps ?? [],
      })),
    },
    null,
    2,
  );
}

type GeneratedJourneyPlan = z.infer<typeof generatedJourneyPlanSchema>;
type GeneratedCheckpointPlan =
  | GeneratedJourneyPlan['checkpoints'][0]
  | GeneratedJourneyPlan['checkpoints'][1]
  | GeneratedJourneyPlan['checkpoints'][2];
type GeneratedActivityPlan =
  | GeneratedCheckpointPlan['activities'][0]
  | GeneratedCheckpointPlan['activities'][1];

function normalizeGeneratedActivity(
  activity: GeneratedActivityPlan,
  checkpointIndex: number,
  activityIndex: number,
  sourceTitle: string,
): JourneyActivity {
  return {
    ...activity,
    id: createActivityId(checkpointIndex, activityIndex),
    maxScore: 1,
    xpReward: getDefaultXp(activity.type),
    estimatedSeconds: getDefaultEstimatedSeconds(activity.type),
    masteryTags: normalizeMasteryTags(activity.masteryTags, sourceTitle),
  };
}

function buildCheckpointActivitiesMock(
  input: JourneyGenerateRequest,
  checkpointIndex: number,
  sourceTitle: string,
  sourceExcerpt: string,
): JourneyActivity[] {
  const sharedTags = [sourceTitle.toLowerCase(), 'knowledge-journey'];

  if (checkpointIndex === 0) {
    return [
      {
        id: createActivityId(checkpointIndex, 0),
        type: 'multiple-choice',
        title: 'Найди опорную точку',
        prompt: `С чего логичнее всего начинать разбор темы "${sourceTitle}"?`,
        description: 'Первый шаг должен помочь построить дальнейшую последовательность.',
        hint: 'Сначала нужен базовый смысловой якорь, а не детали.',
        xpReward: 20,
        maxScore: 1,
        masteryTags: [...sharedTags, 'foundations'],
        estimatedSeconds: 90,
        allowMultiple: false,
        options: [
          { id: 'a', label: 'Выделить базовую концепцию и зафиксировать её своими словами' },
          { id: 'b', label: 'Сразу перейти к редким исключениям и пограничным кейсам' },
          { id: 'c', label: 'Перечитывать текст до ощущения, что всё понятно' },
        ],
        correctOptionIds: ['a'],
      },
      {
        id: createActivityId(checkpointIndex, 1),
        type: 'fill-the-blank',
        title: 'Заполни пропуск',
        prompt: 'Вставь ключевое слово в пропуск.',
        hint: 'Ищи слово про сам материал или источник.',
        xpReward: 15,
        maxScore: 1,
        masteryTags: [...sharedTags, 'grounding'],
        estimatedSeconds: 75,
        sentence: `Короткое объяснение темы "${sourceTitle}" должно опираться на ____, а не на догадку.`,
        placeholder: 'Введите слово',
        acceptedAnswers: ['материал', 'источник', 'текст'],
      },
    ];
  }

  if (checkpointIndex === 1) {
    return [
      {
        id: createActivityId(checkpointIndex, 0),
        type: 'order-steps',
        title: 'Собери порядок',
        prompt: `Расставь логику разбора темы "${sourceTitle}" от базы к применению.`,
        hint: 'Сначала понять базу, потом связи, потом применение.',
        xpReward: 25,
        maxScore: 1,
        masteryTags: [...sharedTags, 'dependencies'],
        estimatedSeconds: 110,
        steps: [
          { id: 'baseline', label: 'Выделить базовое определение' },
          { id: 'relations', label: 'Понять связи между понятиями' },
          { id: 'application', label: 'Проверить, как идея работает в кейсе' },
        ],
        initialOrder: ['application', 'baseline', 'relations'],
      },
      {
        id: createActivityId(checkpointIndex, 1),
        type: 'free-response',
        title: 'Объясни зависимость',
        prompt: `Почему тему "${sourceTitle}" нельзя проверять только через пересказ?`,
        description: 'Нужен короткий аргумент с причинно-следственной связью.',
        hint: 'Ответ должен связать понимание, проверку и реальное воспроизведение.',
        xpReward: 30,
        maxScore: 1,
        masteryTags: [...sharedTags, 'reasoning'],
        estimatedSeconds: 150,
        evaluationRubric: [
          'есть причинно-следственная связь',
          'упомянута активная проверка понимания',
          'объяснён риск иллюзии понимания',
        ],
        expectedConcepts: ['активная проверка', 'иллюзия понимания', 'воспроизведение'],
        idealAnswer:
          'Пересказ может создать иллюзию понимания, поэтому нужна активная проверка, которая показывает, способен ли студент сам воспроизвести идею.',
        minLength: 120,
      },
    ];
  }

  return [
    {
      id: createActivityId(checkpointIndex, 0),
      type: 'teach-back',
      title: 'Teach Back',
      prompt: `Объясни тему "${sourceTitle}" коллеге так, чтобы он понял, зачем она нужна на практике.`,
      hint: 'Нужны простая формулировка и один практический вывод.',
      xpReward: 35,
      maxScore: 1,
      masteryTags: [...sharedTags, 'communication'],
      estimatedSeconds: 180,
      targetAudience: 'коллега по команде',
      evaluationRubric: [
        'объяснение простым языком',
        'есть практический смысл',
        'нет ухода в пустую общность',
      ],
      expectedConcepts: ['простое объяснение', 'практический смысл', sourceTitle],
      idealAnswer:
        `Тема "${sourceTitle}" нужна, чтобы не действовать на ощущениях: сначала мы понимаем базу, потом проверяем связи, и только после этого принимаем решения.`,
      minLength: 140,
    },
    {
      id: createActivityId(checkpointIndex, 1),
      type: 'source-anchor',
      title: 'Source Anchor',
      prompt: 'Ответь на вопрос и покажи, на какой кусок материала ты опираешься.',
      description: `Свяжи свой вывод по теме "${sourceTitle}" с конкретным фрагментом источника.`,
      hint: 'Нужны и вывод, и явная опора на кусок исходного текста.',
      xpReward: 40,
      maxScore: 1,
      masteryTags: [...sharedTags, 'evidence'],
      estimatedSeconds: 210,
      anchorPrompt: 'Какой фрагмент исходного материала лучше всего подтверждает твой вывод?',
      sourceExcerpt: sourceExcerpt,
      evaluationRubric: [
        'есть собственный вывод',
        'есть ссылка на исходный фрагмент',
        'вывод связан с материалом, а не с догадкой',
      ],
      expectedConcepts: ['вывод', 'источник', 'подтверждение'],
      idealAnswer:
        'Сильный ответ сначала формулирует вывод, затем цитирует или пересказывает опорный фрагмент и объясняет, как этот фрагмент подтверждает мысль.',
      minLength: 160,
    },
  ];
}

async function generateJourneyMock(
  input: JourneyGenerateRequest,
): Promise<KnowledgeJourney> {
  const prompt = buildJourneyGenerationPrompt(input);
  const sourceTitle = pickSourceTitle(input);
  const sourceExcerpt = pickExcerpt(input);
  const checkpointTimers: Record<JourneyGenerateRequest['difficulty'], number> = {
    easy: 300,
    medium: 240,
    hard: 180,
  };

  const checkpoints = [0, 1, 2].map((checkpointIndex) => ({
    id: `cp_${checkpointIndex + 1}`,
    title: [
      'Разобрать базу',
      'Проверить связи и логику',
      'Сформулировать и доказать понимание',
    ][checkpointIndex],
    goal: [
      'Понять, что является базовой опорой материала.',
      'Разложить зависимости и объяснить причинно-следственную связь.',
      'Собрать собственное объяснение и привязать его к источнику.',
    ][checkpointIndex],
    order: checkpointIndex + 1,
    dependsOnCheckpointIds: checkpointIndex === 0 ? [] : [`cp_${checkpointIndex}`],
    timerSeconds:
      input.timePressure === 'checkpoint'
        ? checkpointTimers[input.difficulty]
        : undefined,
      narrativeBeat: undefined,
    activities: buildCheckpointActivitiesMock(
      input,
      checkpointIndex,
      sourceTitle,
      sourceExcerpt,
    ),
  }));

  return {
    id: createJourneyId(),
    title: `Knowledge Journey: ${sourceTitle}`,
    sourceType: input.sourceType,
    sourceTitle,
    sourceSummary: `${summarizeSource(input)} Generated from prompt seed: ${prompt}`,
    sourceText: input.sourceText,
    difficulty: input.difficulty,
    narrativeMode: input.narrativeMode,
    timePressure: input.timePressure,
    estimatedMinutes: checkpoints.length * 6,
    globalTimerSeconds:
      input.timePressure === 'global'
        ? checkpoints.length * checkpointTimers[input.difficulty]
        : undefined,
    generatedAt: new Date().toISOString(),
    checkpoints,
  };
}

async function generateJourneyWithOpenAI(
  input: JourneyGenerateRequest,
): Promise<KnowledgeJourney> {
  const plan = await requestStructuredCompletion({
    schema: generatedJourneyPlanSchema,
    schemaName: 'knowledge_journey_plan',
    system: buildJourneyGenerationSystemPrompt(),
    user: buildJourneyGenerationPrompt(input),
  });

  const checkpointTimers: Record<JourneyGenerateRequest['difficulty'], number> = {
    easy: 300,
    medium: 240,
    hard: 180,
  };
  const sourceTitle = plan.sourceTitle || pickSourceTitle(input);

  return {
    id: createJourneyId(),
    title: plan.title,
    sourceType: input.sourceType,
    sourceTitle,
    sourceSummary: plan.sourceSummary,
    sourceText: input.sourceText,
    difficulty: input.difficulty,
    narrativeMode: input.narrativeMode,
    timePressure: input.timePressure,
    estimatedMinutes: 18,
    globalTimerSeconds:
      input.timePressure === 'global' ? 3 * checkpointTimers[input.difficulty] : undefined,
    generatedAt: new Date().toISOString(),
    checkpoints: (plan.checkpoints as GeneratedCheckpointPlan[]).map(
      (checkpoint, checkpointIndex) => ({
      id: `cp_${checkpointIndex + 1}`,
      title: checkpoint.title,
      goal: checkpoint.goal,
      order: checkpointIndex + 1,
      dependsOnCheckpointIds: checkpointIndex === 0 ? [] : [`cp_${checkpointIndex}`],
      timerSeconds:
        input.timePressure === 'checkpoint'
          ? checkpointTimers[input.difficulty]
          : undefined,
      narrativeBeat: undefined,
      activities: (checkpoint.activities as GeneratedActivityPlan[]).map((activity, activityIndex) =>
        normalizeGeneratedActivity(activity, checkpointIndex, activityIndex, sourceTitle),
      ),
      }),
    ),
  };
}

async function evaluateOpenResponseWithOpenAI(input: EvaluateAttemptRequest) {
  const evaluation = await requestStructuredCompletion({
    schema: openResponseEvaluationSchema,
    schemaName: 'open_response_evaluation',
    system: buildAttemptEvaluationSystemPrompt(),
    user: buildAttemptEvaluationPrompt(input),
  });

  return buildNormalizedEvaluation(input.activity, evaluation);
}

async function buildReportWithOpenAI(input: BuildReportRequest) {
  const baseReport = buildJourneyReport(input);
  const narrative = await requestStructuredCompletion({
    schema: reportNarrativeSchema,
    schemaName: 'journey_report_narrative',
    system: buildReportSystemPrompt(),
    user: buildReportPrompt(input, buildBaseReportSummary(input)),
  });

  return {
    ...baseReport,
    masteredConcepts:
      narrative.masteredConcepts.length > 0
        ? narrative.masteredConcepts
        : baseReport.masteredConcepts,
    weakConcepts:
      narrative.weakConcepts.length > 0
        ? narrative.weakConcepts
        : baseReport.weakConcepts,
    checkpointSummaries: baseReport.checkpointSummaries.map((summary, index) => ({
      ...summary,
      highlights:
        narrative.checkpointSummaries[index]?.highlights.length > 0
          ? narrative.checkpointSummaries[index].highlights
          : summary.highlights,
      needsWork:
        narrative.checkpointSummaries[index]?.needsWork.length > 0
          ? narrative.checkpointSummaries[index].needsWork
          : summary.needsWork,
    })),
    finalRecommendation: narrative.finalRecommendation,
    artifactMarkdown: narrative.artifactMarkdown,
  };
}

export async function generateJourney(
  input: JourneyGenerateRequest,
): Promise<KnowledgeJourney> {
  if (!isOpenAIConfigured()) {
    return generateJourneyMock(input);
  }

  try {
    return await generateJourneyWithOpenAI(input);
  } catch {
    return generateJourneyMock(input);
  }
}

export async function evaluateAttempt(input: EvaluateAttemptRequest) {
  if (!isOpenResponseType(input.activity.type) || !isOpenAIConfigured()) {
    return evaluateActivityAttempt(input.activity, input.studentAnswer);
  }

  try {
    return await evaluateOpenResponseWithOpenAI(input);
  } catch {
    return evaluateActivityAttempt(input.activity, input.studentAnswer);
  }
}

export async function buildReport(input: BuildReportRequest) {
  if (!isOpenAIConfigured()) {
    return buildJourneyReport(input);
  }

  try {
    return await buildReportWithOpenAI(input);
  } catch {
    return buildJourneyReport(input);
  }
}
