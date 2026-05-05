import type {
  BuildReportRequest,
  EvaluateAttemptRequest,
  JourneyGenerateRequest,
} from '../../src/lib/journey';

function buildSourcePayload(input: JourneyGenerateRequest) {
  if (input.sourceType === 'topic') {
    return `Тема: ${input.topic?.trim() ?? ''}`;
  }

  return `Учебный материал:\n${input.sourceText?.trim().slice(0, 12_000) ?? ''}`;
}

export function buildJourneyGenerationSystemPrompt() {
  return [
    'Ты проектируешь профессиональные learning journeys по учебному материалу.',
    'Нужен строгий, деловой тон без инфантильности.',
    'Собери ровно 3 чекпоинта: foundations -> dependencies -> explain-and-prove.',
    'Каждый чекпоинт должен проверять реальное понимание, а не поверхностный пересказ.',
    'В первом чекпоинте нужны 2 короткие объективные активности.',
    'Во втором чекпоинте: одна activity на связи или порядок и одна free-response.',
    'В третьем чекпоинте: одна teach-back и одна source-anchor.',
    'Не повторяй sourceTitle в title чекпоинтов: titles должны быть короткими и разными.',
    'Для fill-the-blank prompt должен быть короткой инструкцией, а sentence отдельно несёт текст с пропуском.',
    'Дистракторы в тестовых вопросах должны быть правдоподобными, но неверными.',
    'SourceAnchor должен ссылаться на реальный или сжатый опорный фрагмент материала.',
    'Не делай generic prompts; опирайся на конкретный материал пользователя.',
  ].join(' ');
}

export function buildJourneyGenerationPrompt(input: JourneyGenerateRequest) {
  return [
    'Построй Knowledge Journey по данным ниже.',
    `Source type: ${input.sourceType}.`,
    `Difficulty: ${input.difficulty}.`,
    `Narrative mode: ${input.narrativeMode}.`,
    `Time pressure: ${input.timePressure}.`,
    buildSourcePayload(input),
  ].join('\n\n');
}

export function buildAttemptEvaluationSystemPrompt() {
  return [
    'Ты оцениваешь учебные ответы студента.',
    'Нужно быть строгим, но полезным.',
    'Оценивай смысл, а не только совпадение слов.',
    'Если мысль правильная, но формулировка своя, не штрафуй автоматически.',
    'Feedback должен быть конкретным и кратким.',
  ].join(' ');
}

export function buildAttemptEvaluationPrompt(input: EvaluateAttemptRequest) {
  return [
    'Оцени ответ студента для Knowledge Journey activity.',
    `Activity type: ${input.activity.type}`,
    `Elapsed seconds: ${input.elapsedSeconds}`,
    `Activity JSON: ${JSON.stringify(input.activity)}`,
    `Student answer JSON: ${JSON.stringify(input.studentAnswer)}`,
  ].join('\n\n');
}

export function buildReportSystemPrompt() {
  return [
    'Ты собираешь итоговую учебную сводку по Knowledge Journey.',
    'Нужен полезный артефакт, который хочется сохранить.',
    'Пиши конкретно: что усвоено, что проседает, что делать дальше.',
    'Не используй рекламный или мотивационный тон.',
  ].join(' ');
}

export function buildReportPrompt(
  input: BuildReportRequest,
  baseReportSummary: string,
) {
  return [
    'Собери narrative-часть итогового отчёта для завершённого Knowledge Journey.',
    `Journey title: ${input.journey.title}`,
    `Checkpoints: ${input.journey.checkpoints.length}`,
    `Attempts JSON: ${JSON.stringify(input.attempts)}`,
    `Base report summary: ${baseReportSummary}`,
  ].join('\n\n');
}
