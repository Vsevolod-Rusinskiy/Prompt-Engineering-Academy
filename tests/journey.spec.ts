import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('journey flow проходит от генерации до финального отчёта', async ({ page }) => {
  await page.goto('/journey');

  await page.getByRole('button', { name: 'Сгенерировать journey' }).click();

  await expect(page).toHaveURL(/\/journey\/run$/);
  await expect(page.getByRole('heading', { name: /Knowledge Journey:/i })).toBeVisible();

  const checkpointOneMcq = page.getByTestId('journey-activity-cp1_act1');
  await checkpointOneMcq.getByLabel(/выделить базовую концепцию/i).check();
  await checkpointOneMcq.getByTestId('journey-submit-cp1_act1').click();

  const checkpointOneBlank = page.getByTestId('journey-activity-cp1_act2');
  await checkpointOneBlank.getByPlaceholder('Введите слово').fill('материал');
  await checkpointOneBlank.getByTestId('journey-submit-cp1_act2').click();

  await page.getByTestId('journey-advance').click();

  const checkpointTwoOrder = page.getByTestId('journey-activity-cp2_act1');
  await checkpointTwoOrder.getByRole('button', { name: 'Вверх' }).nth(1).click();
  await checkpointTwoOrder.getByRole('button', { name: 'Вверх' }).nth(2).click();
  await checkpointTwoOrder.getByTestId('journey-submit-cp2_act1').click();

  const checkpointTwoResponse = page.getByTestId('journey-activity-cp2_act2');
  await checkpointTwoResponse
    .getByPlaceholder('Напиши ответ своими словами')
    .fill(
      'Пересказ даёт иллюзию понимания. Нужна активная проверка, потому что только она показывает, может ли студент сам воспроизвести идею и связать её с практикой.',
    );
  await checkpointTwoResponse.getByTestId('journey-submit-cp2_act2').click();

  await page.getByTestId('journey-advance').click();

  const checkpointThreeTeachBack = page.getByTestId('journey-activity-cp3_act1');
  await checkpointThreeTeachBack
    .getByPlaceholder('Напиши ответ своими словами')
    .fill(
      'Backpropagation нужен на практике, потому что помогает понять, как модель исправляет ошибку и почему обучение идёт не на ощущениях, а по измеримому сигналу.',
    );
  await checkpointThreeTeachBack.getByTestId('journey-submit-cp3_act1').click();

  const checkpointThreeAnchor = page.getByTestId('journey-activity-cp3_act2');
  await checkpointThreeAnchor
    .getByPlaceholder('Сформулируй свой вывод')
    .fill(
      'Сильный ответ должен не только объяснить мысль, но и показать, на какой материал он опирается.',
    );
  await checkpointThreeAnchor
    .getByPlaceholder(/какой фрагмент исходного материала/i)
    .fill('grounded in the supplied explanation, not in guesswork');
  await checkpointThreeAnchor.getByTestId('journey-submit-cp3_act2').click();

  await page.getByTestId('journey-advance').click();

  await expect(page).toHaveURL(/\/journey\/report$/);
  await expect(page.getByRole('heading', { name: /Knowledge Journey:/i })).toBeVisible();
  await expect(page.getByText('Итоговый документ')).toBeVisible();
  await expect(page.getByText(/Journey завершен/i)).toBeVisible();
});
