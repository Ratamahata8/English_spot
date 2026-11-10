import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { WorkbookExercise } from '../../src/workbook/types';
import { solve } from './helpers/workbook';
const exercises = JSON.parse(
  readFileSync('src/workbook/data/edition-2026-intro-module-one.json', 'utf8'),
) as WorkbookExercise[];

for (const exercise of exercises)
  test('2026 видео: полное прохождение ' + exercise.id, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('#/workbook/' + exercise.id);
    for (const [i, task] of exercise.tasks.entries()) {
      await expect(page.locator('[data-workbook]')).toHaveAttribute('data-task', String(i));
      await solve(page, task);
    }
    await expect(
      page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Потренироваться ещё раз', exact: true }).click();
    await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
    expect(errors).toEqual([]);
  });

test('2026: мобильная помощь, современный источник слова и переход из словаря', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/workbook/wb26-m1a-03');
  await page.getByRole('button', { name: /\? Подсказки/ }).click();
  // A known word in the sentence tile opens the shared dictionary form with this edition's proof.
  await page
    .locator('.wb-token-bank .word-token')
    .filter({ hasText: /^school$/ })
    .first()
    .click();
  const help = page.getByRole('dialog', { name: 'Подсказка к слову' });
  await expect(help).toBeVisible();
  await help.getByRole('link', { name: 'К основной словарной статье →' }).click();
  await expect(page.getByLabel('Издание сборника')).toHaveValue('spotlight_workbook_2026_17');
  await page.getByText('Подтверждённые места в сборнике', { exact: true }).first().click();
  const link = page.locator('.wb-form details').getByRole('link').first();
  await expect(link).toHaveAttribute('href', /\/workbook\/wb26-/);
  const response = page.waitForResponse(
    (r) => r.url().includes('/audio/workbook/') && [200, 206].includes(r.status()),
  );
  await page.getByRole('button', { name: '♫ school', exact: true }).click();
  await response;
  await link.click();
  await expect(page.locator('[data-workbook]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
