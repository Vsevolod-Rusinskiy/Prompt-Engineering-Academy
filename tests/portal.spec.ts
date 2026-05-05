import { expect, test } from '@playwright/test';

test('главная страница показывает статьи и вход в итоговый тест', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: /учиться через активное прохождение/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Итоговый тест', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Запустить Journey' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Читать статью' })).toHaveCount(3);
});

test('каждая статья открывается и содержит inline-упражнения без общего прогресса', async ({
  page,
}) => {
  const articles = [
    {
      slug: 'llm-and-tokens',
      heading: 'Как работают LLM и токены',
    },
    {
      slug: 'hallucinations-and-safety',
      heading: 'Галлюцинации и безопасность',
    },
    {
      slug: 'prompt-structure',
      heading: 'Структура эффективного промпта: роль, контекст, ограничения',
    },
  ];

  for (const article of articles) {
    await page.goto(`/articles/${article.slug}`);
    await expect(page.getByRole('heading', { name: article.heading })).toBeVisible();
    await expect(page.locator('.article-section--exercise')).toHaveCount(3);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  }
});
