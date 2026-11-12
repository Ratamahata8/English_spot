import { test, expect } from '@playwright/test';

test('словарь уроков находит служебные слова подсказок без сломанных иллюстраций', async ({
  page,
}) => {
  const imageFailures: string[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image' && response.status() >= 400)
      imageFailures.push(response.url());
  });
  await page.goto('#/dictionary?source=lessons');
  const search = page.getByRole('textbox', { name: 'Найти слово' });
  await search.fill('является');
  const card = page
    .locator('.word-card')
    .filter({ has: page.locator('.word-name', { hasText: /^is$/ }) });
  await expect(card).toBeVisible();
  await expect(card).toContainText('/ɪz/');
  await expect(card.locator('img')).toHaveCount(0);
  await card.getByRole('button', { name: '+ Добавить в повторение', exact: true }).click();
  await expect(card.getByRole('button', { name: 'В повторении ✓' })).toBeDisabled();
  await page.reload();
  await search.fill('является');
  await expect(card.getByRole('button', { name: 'В повторении ✓' })).toBeDisabled();
  await search.fill('school');
  await expect(page.locator('.word-card img').first()).toBeVisible();
  expect(imageFailures).toEqual([]);
});
