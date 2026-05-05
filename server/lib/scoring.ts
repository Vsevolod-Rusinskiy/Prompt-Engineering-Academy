import type {
  ActivityEvaluation,
  BuildReportRequest,
  JourneyActivity,
  JourneyAttempt,
  JourneyCheckpointReportSummary,
  JourneyReport,
  SourceAnchorJourneyActivity,
} from '../../src/lib/journey';

function clampScore(value: number) {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length >= 3),
    ),
  );
}

function getStatus(score: number): ActivityEvaluation['status'] {
  if (score >= 0.95) {
    return 'correct';
  }

  if (score <= 0.25) {
    return 'incorrect';
  }

  return 'partial';
}

function extractOpenAnswerParts(studentAnswer: unknown) {
  if (typeof studentAnswer === 'string') {
    return {
      mainText: studentAnswer,
      anchorText: '',
    };
  }

  if (
    studentAnswer &&
    typeof studentAnswer === 'object' &&
    !Array.isArray(studentAnswer)
  ) {
    const record = studentAnswer as Record<string, unknown>;
    const mainText =
      typeof record.text === 'string'
        ? record.text
        : typeof record.answer === 'string'
          ? record.answer
          : typeof record.response === 'string'
            ? record.response
            : '';
    const anchorText = typeof record.anchor === 'string' ? record.anchor : '';

    return { mainText, anchorText };
  }

  return {
    mainText: '',
    anchorText: '',
  };
}

function scoreKeywordCoverage(expected: string[], actual: string) {
  const actualTokens = tokenize(actual);
  const matched = expected.filter((item) =>
    tokenize(item).some((token) => actualTokens.includes(token)),
  );

  return {
    matched,
    missing: expected.filter((item) => !matched.includes(item)),
    coverage: expected.length === 0 ? 0 : matched.length / expected.length,
  };
}

function buildFeedback(
  status: ActivityEvaluation['status'],
  strengths: string[],
  gaps: string[],
) {
  if (status === 'correct') {
    return strengths[0] ?? 'Ответ закрывает ожидаемые критерии.';
  }

  if (status === 'partial') {
    return gaps[0]
      ? `Ответ движется в правильную сторону, но ${gaps[0].toLowerCase()}.`
      : 'Часть критериев закрыта, но ответ ещё можно усилить.';
  }

  return gaps[0]
    ? `Пока ответ не опирается на ключевые критерии: ${gaps[0].toLowerCase()}.`
    : 'Ответ пока не закрывает ожидаемые критерии.';
}

function buildHint(activity: JourneyActivity, gaps: string[]) {
  if (activity.hint) {
    return activity.hint;
  }

  if (gaps.length > 0) {
    return `Следующая попытка: добавь ${gaps[0].toLowerCase()}.`;
  }

  return 'Перечитай формулировку и собери ответ по шагам.';
}

function finalizeEvaluation(
  activity: JourneyActivity,
  score: number,
  strengths: string[],
  gaps: string[],
) {
  const normalizedScore = clampScore(score);
  const status = getStatus(normalizedScore);

  return {
    score: normalizedScore,
    status,
    passed: normalizedScore >= 0.6,
    feedback: buildFeedback(status, strengths, gaps),
    hint: buildHint(activity, gaps),
    strengths,
    gaps,
    xpAwarded: Math.round(activity.xpReward * normalizedScore),
  } satisfies ActivityEvaluation;
}

function evaluateMultipleChoice(activity: JourneyActivity, studentAnswer: unknown) {
  if (activity.type !== 'multiple-choice') {
    return finalizeEvaluation(activity, 0, [], ['Неверный тип активности для оценки']);
  }

  const provided = Array.isArray(studentAnswer)
    ? studentAnswer.filter((value): value is string => typeof value === 'string')
    : typeof studentAnswer === 'string'
      ? [studentAnswer]
      : [];

  const expected = new Set(activity.correctOptionIds);

  if (!activity.allowMultiple) {
    const score =
      provided.length === 1 && provided[0] === activity.correctOptionIds[0] ? 1 : 0;

    return finalizeEvaluation(
      activity,
      score,
      score === 1 ? ['Выбран точный вариант.'] : [],
      score === 1 ? [] : ['Выбран не тот вариант ответа'],
    );
  }

  const correctSelections = provided.filter((id) => expected.has(id)).length;
  const incorrectSelections = provided.filter((id) => !expected.has(id)).length;
  const score =
    (correctSelections - incorrectSelections) / activity.correctOptionIds.length;

  return finalizeEvaluation(
    activity,
    score,
    correctSelections > 0
      ? [`Найдено ${correctSelections} правильных опорных ответа.`]
      : [],
    incorrectSelections > 0
      ? [`Убраны не все дистракторы: ${incorrectSelections} лишних вариантов.`]
      : [],
  );
}

function evaluateTrueFalse(activity: JourneyActivity, studentAnswer: unknown) {
  if (activity.type !== 'true-false') {
    return finalizeEvaluation(activity, 0, [], ['Неверный тип активности для оценки']);
  }

  const score = studentAnswer === activity.correctAnswer ? 1 : 0;

  return finalizeEvaluation(
    activity,
    score,
    score === 1 ? ['Бинарное суждение определено корректно.'] : [],
    score === 1 ? [] : ['Базовое утверждение оценено неверно'],
  );
}

function evaluateFillTheBlank(activity: JourneyActivity, studentAnswer: unknown) {
  if (activity.type !== 'fill-the-blank') {
    return finalizeEvaluation(activity, 0, [], ['Неверный тип активности для оценки']);
  }

  const answer = typeof studentAnswer === 'string' ? normalizeText(studentAnswer) : '';
  const accepted = activity.acceptedAnswers.map(normalizeText);
  const score = accepted.includes(answer) ? 1 : 0;

  return finalizeEvaluation(
    activity,
    score,
    score === 1 ? ['Ключевой термин восстановлен точно.'] : [],
    score === 1 ? [] : ['Не попал в ожидаемый термин'],
  );
}

function evaluateMatchPairs(activity: JourneyActivity, studentAnswer: unknown) {
  if (activity.type !== 'match-pairs') {
    return finalizeEvaluation(activity, 0, [], ['Неверный тип активности для оценки']);
  }

  const answer =
    studentAnswer && typeof studentAnswer === 'object' && !Array.isArray(studentAnswer)
      ? (studentAnswer as Record<string, unknown>)
      : {};
  const correctCount = activity.pairs.reduce((total, pair) => {
    return total + Number(answer[pair.left] === pair.right);
  }, 0);
  const score = correctCount / activity.pairs.length;

  return finalizeEvaluation(
    activity,
    score,
    correctCount > 0
      ? [`Собрано ${correctCount} корректных связей.`]
      : [],
    correctCount < activity.pairs.length
      ? ['Часть связей между понятиями пока перепутана']
      : [],
  );
}

function evaluateOrderSteps(activity: JourneyActivity, studentAnswer: unknown) {
  if (activity.type !== 'order-steps') {
    return finalizeEvaluation(activity, 0, [], ['Неверный тип активности для оценки']);
  }

  const answer = Array.isArray(studentAnswer)
    ? studentAnswer.filter((value): value is string => typeof value === 'string')
    : [];
  const correctCount = activity.steps.reduce((total, step, index) => {
    return total + Number(answer[index] === step.id);
  }, 0);
  const score = correctCount / activity.steps.length;

  return finalizeEvaluation(
    activity,
    score,
    correctCount > 0
      ? [`На месте уже ${correctCount} шаг(ов) из ${activity.steps.length}.`]
      : [],
    correctCount < activity.steps.length
      ? ['Последовательность ещё не совпадает с ожидаемой логикой']
      : [],
  );
}

function evaluateOpenResponse(activity: JourneyActivity, studentAnswer: unknown) {
  if (
    activity.type !== 'free-response' &&
    activity.type !== 'teach-back' &&
    activity.type !== 'source-anchor'
  ) {
    return finalizeEvaluation(activity, 0, [], ['Неверный тип активности для оценки']);
  }

  const { mainText, anchorText } = extractOpenAnswerParts(studentAnswer);
  const textCoverage = scoreKeywordCoverage(activity.expectedConcepts, mainText);
  const rubricCoverage = scoreKeywordCoverage(activity.evaluationRubric, mainText);
  const minLengthScore = activity.minLength
    ? Math.min(mainText.trim().length / activity.minLength, 1)
    : 1;

  let score = textCoverage.coverage * 0.65 + rubricCoverage.coverage * 0.2 + minLengthScore * 0.15;
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (textCoverage.matched.length > 0) {
    strengths.push(
      `Отражены ключевые идеи: ${textCoverage.matched.slice(0, 2).join(', ')}.`,
    );
  }

  if (textCoverage.missing.length > 0) {
    gaps.push(
      `не хватает опоры на ${textCoverage.missing.slice(0, 2).join(', ')}`,
    );
  }

  if (activity.type === 'teach-back') {
    strengths.push(`Формат объяснения можно отдавать аудитории "${activity.targetAudience}".`);
  }

  if (activity.type === 'source-anchor') {
    const anchorScore = scoreSourceAnchor(activity, anchorText || mainText);
    score = score * 0.75 + anchorScore * 0.25;

    if (anchorScore > 0.6) {
      strengths.push('Ответ опирается на конкретный фрагмент исходного материала.');
    } else {
      gaps.push('не хватает явной привязки к исходному фрагменту');
    }
  }

  if (mainText.trim().length === 0) {
    gaps.unshift('ответ пока пустой');
  }

  return finalizeEvaluation(activity, score, strengths, gaps);
}

function scoreSourceAnchor(
  activity: SourceAnchorJourneyActivity,
  anchorText: string,
) {
  const excerptTokens = tokenize(activity.sourceExcerpt);
  const anchorTokens = tokenize(anchorText);
  const overlap = excerptTokens.filter((token) => anchorTokens.includes(token));

  return excerptTokens.length === 0 ? 0 : overlap.length / excerptTokens.length;
}

export function evaluateActivityAttempt(
  activity: JourneyActivity,
  studentAnswer: unknown,
) {
  switch (activity.type) {
    case 'multiple-choice':
      return evaluateMultipleChoice(activity, studentAnswer);
    case 'true-false':
      return evaluateTrueFalse(activity, studentAnswer);
    case 'fill-the-blank':
      return evaluateFillTheBlank(activity, studentAnswer);
    case 'match-pairs':
      return evaluateMatchPairs(activity, studentAnswer);
    case 'order-steps':
      return evaluateOrderSteps(activity, studentAnswer);
    case 'free-response':
    case 'teach-back':
    case 'source-anchor':
      return evaluateOpenResponse(activity, studentAnswer);
  }
}

function buildCheckpointSummary(
  title: string,
  checkpointId: string,
  attempts: JourneyAttempt[],
): JourneyCheckpointReportSummary {
  const evaluations = attempts
    .map((attempt) => attempt.evaluation)
    .filter((evaluation): evaluation is NonNullable<JourneyAttempt['evaluation']> =>
      Boolean(evaluation),
    );
  const score = evaluations.reduce((total, item) => total + item.score, 0);
  const maxScore = Math.max(attempts.length, 1);
  const highlights = Array.from(
    new Set(evaluations.flatMap((evaluation) => evaluation.strengths)),
  ).slice(0, 3);
  const needsWork = Array.from(
    new Set(evaluations.flatMap((evaluation) => evaluation.gaps)),
  ).slice(0, 3);

  return {
    checkpointId,
    title,
    score,
    maxScore,
    mastered: score / maxScore >= 0.7,
    highlights,
    needsWork,
  };
}

function buildFinalRecommendation(percent: number) {
  if (percent >= 85) {
    return 'Темп держится. Можно усложнять сценарии и добавлять больше открытых ответов.';
  }

  if (percent >= 60) {
    return 'База уже есть, но стоит усилить объяснение связей между понятиями и опору на источник.';
  }

  return 'Сначала укрепи базовые концепции и пройди journey ещё раз с более медленным разбором ошибок.';
}

export function buildJourneyReport({
  journey,
  attempts,
}: BuildReportRequest): JourneyReport {
  const evaluatedAttempts = attempts
    .map((attempt) => attempt.evaluation)
    .filter((evaluation): evaluation is NonNullable<JourneyAttempt['evaluation']> =>
      Boolean(evaluation),
    );
  const totalScore = evaluatedAttempts.reduce(
    (total, evaluation) => total + evaluation.score,
    0,
  );
  const maxScore = journey.checkpoints.reduce(
    (total, checkpoint) => total + checkpoint.activities.length,
    0,
  );
  const percent = maxScore === 0 ? 0 : Math.round((totalScore / maxScore) * 100);

  const checkpointSummaries = journey.checkpoints.map((checkpoint) =>
    buildCheckpointSummary(
      checkpoint.title,
      checkpoint.id,
      attempts.filter((attempt) => attempt.checkpointId === checkpoint.id),
    ),
  );

  const conceptScores = new Map<string, number[]>();

  attempts.forEach((attempt) => {
    if (!attempt.evaluation) {
      return;
    }

    attempt.masteryTags.forEach((tag) => {
      const bucket = conceptScores.get(tag) ?? [];
      bucket.push(attempt.evaluation!.score);
      conceptScores.set(tag, bucket);
    });
  });

  const masteredConcepts: string[] = [];
  const weakConcepts: string[] = [];

  conceptScores.forEach((scores, tag) => {
    const average = scores.reduce((total, score) => total + score, 0) / scores.length;

    if (average >= 0.75) {
      masteredConcepts.push(tag);
    } else if (average <= 0.5) {
      weakConcepts.push(tag);
    }
  });

  const artifactMarkdown = [
    `# ${journey.title}`,
    '',
    `- Итоговый результат: ${percent}%`,
    `- Баллы: ${totalScore.toFixed(1)} / ${maxScore}`,
    `- Сильные зоны: ${masteredConcepts.join(', ') || 'пока не выделены'}`,
    `- Зоны роста: ${weakConcepts.join(', ') || 'не выявлены'}`,
    '',
    '## Чекпоинты',
    ...checkpointSummaries.flatMap((summary) => [
      `### ${summary.title}`,
      `- Баллы: ${summary.score.toFixed(1)} / ${summary.maxScore}`,
      `- Сильное: ${summary.highlights.join('; ') || 'нужно больше данных'}`,
      `- Подтянуть: ${summary.needsWork.join('; ') || 'критичных пробелов нет'}`,
      '',
    ]),
  ].join('\n');

  return {
    totalScore,
    maxScore,
    percent,
    masteredConcepts,
    weakConcepts,
    checkpointSummaries,
    finalRecommendation: buildFinalRecommendation(percent),
    artifactMarkdown,
  };
}
