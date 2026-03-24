import { expect, test } from '@playwright/test';

test('inline exercise показывает неверный и затем верный ответ', async ({ page }) => {
  await page.goto('/articles/llm-and-tokens');

  const card = page.getByTestId('exercise-card-article-llm-true-false');
  await card.getByRole('button', { name: 'Верно', exact: true }).click();
  await card.getByTestId('exercise-check-article-llm-true-false').click();
  await expect(card.getByTestId('exercise-state-article-llm-true-false')).toHaveText(
    'Неверно',
  );

  await card.getByTestId('exercise-reset-article-llm-true-false').click();
  await card.getByRole('button', { name: 'Неверно', exact: true }).click();
  await card.getByTestId('exercise-check-article-llm-true-false').click();
  await expect(card.getByTestId('exercise-state-article-llm-true-false')).toHaveText('Верно');
});

test('MatchPairs умеет показывать частично правильный результат', async ({ page }) => {
  await page.goto('/articles/hallucinations-and-safety');

  const card = page.getByTestId('exercise-card-article-safety-match');
  const selects = card.locator('select');

  await selects.nth(0).selectOption('Проверить у врача и по официальным рекомендациям');
  await selects.nth(1).selectOption('Свериться с актуальным текстом закона');
  await selects.nth(2).selectOption('Свериться с актуальным текстом закона');
  await card.getByTestId('exercise-check-article-safety-match').click();

  await expect(card.getByTestId('exercise-state-article-safety-match')).toHaveText(
    'Частично верно',
  );
});

test('PromptBuilder собирается и проходит проверку', async ({ page }) => {
  await page.goto('/articles/prompt-structure');

  const card = page.getByTestId('exercise-card-article-structure-builder');

  await card.getByTestId('builder-slot-button-article-structure-builder-role').click();
  await card.getByTestId('builder-block-article-structure-builder-block-role').click();

  await card.getByTestId('builder-slot-button-article-structure-builder-context').click();
  await card.getByTestId('builder-block-article-structure-builder-block-context').click();

  await card.getByTestId('builder-slot-button-article-structure-builder-task').click();
  await card.getByTestId('builder-block-article-structure-builder-block-task').click();

  await card.getByTestId('builder-slot-button-article-structure-builder-format').click();
  await card.getByTestId('builder-block-article-structure-builder-block-format').click();

  await card.getByTestId('exercise-check-article-structure-builder').click();

  await expect(card.getByTestId('exercise-state-article-structure-builder')).toHaveText(
    'Верно',
  );
});

test('PromptAudit проходит проверку как новый кастомный компонент', async ({ page }) => {
  await page.goto('/articles/prompt-structure');

  const card = page.getByTestId('exercise-card-article-structure-audit');

  await card.getByTestId('audit-present-article-structure-audit-audit-topic').click();
  await card.getByTestId('audit-missing-article-structure-audit-audit-role').click();
  await card.getByTestId('audit-missing-article-structure-audit-audit-context').click();
  await card.getByTestId('audit-missing-article-structure-audit-audit-format').click();
  await card.getByTestId('exercise-check-article-structure-audit').click();

  await expect(card.getByTestId('exercise-state-article-structure-audit')).toHaveText(
    'Верно',
  );
});
