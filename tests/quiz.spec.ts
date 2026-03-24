import { expect, test } from '@playwright/test';

test('quiz mode обновляет прогресс, балл и итоговую сводку', async ({ page }) => {
  await page.goto('/quiz');

  await expect(page.getByTestId('quiz-progress-copy')).toHaveText('0 из 10');

  const firstCard = page.getByTestId('exercise-card-quiz-mcq-single');
  await firstCard.getByLabel(/предсказывает следующий токен/i).check();
  await firstCard.getByTestId('exercise-check-quiz-mcq-single').click();

  await expect(page.getByTestId('quiz-progress-copy')).toHaveText('1 из 10');
  await expect(firstCard.getByTestId('exercise-score-quiz-mcq-single')).toHaveText(
    'Балл: 1.0 / 1',
  );

  await page.getByRole('button', { name: 'Завершить тест' }).click();
  await expect(page.getByTestId('quiz-summary')).toContainText('Отвечено: 1 из 10');
  await expect(page.getByTestId('quiz-summary')).toContainText('Неотвеченных вопросов: 9');
});

test('финальный тест содержит 10 вопросов и шесть форматов заданий', async ({ page }) => {
  await page.goto('/quiz');

  await expect(page.locator('[data-exercise-mode="quiz"]')).toHaveCount(10);

  await expect(page.locator('.exercise-card__type')).toContainText([
    'MultipleChoice',
    'MultipleChoice',
    'TrueFalse',
    'FillTheBlank',
    'MatchPairs',
    'OrderSteps',
    'PromptBuilder',
    'FillTheBlank',
    'TrueFalse',
    'MatchPairs',
  ]);
});
