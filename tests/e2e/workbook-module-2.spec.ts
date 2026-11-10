import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const units = JSON.parse(
  readFileSync('src/workbook/data/edition-2026-rest.json', 'utf8'),
) as WorkbookExercise[];
const catalog = JSON.parse(
  readFileSync('src/workbook/data/edition-2026-rest-catalog.json', 'utf8'),
) as { module: string; bookPage: number; number: number; adaptationIds: string[] }[];
import type { WorkbookExercise } from '../../src/workbook/types';
import { solve } from './helpers/workbook';
const module = '2';
const selected = (units as WorkbookExercise[]).filter((e) => e.id.startsWith('wb26-m' + module));
for (const e of selected)
  test('2026 module ' + module + ': complete, persist and repeat ' + e.id, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('#/workbook/' + e.id);
    for (const [i, t] of e.tasks.entries()) {
      await expect(page.locator('[data-workbook]')).toHaveAttribute('data-task', String(i));
      await solve(page, t);
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
test('module ' + module + ': mobile source lookup, preparation and audio', async ({ page }) => {
  const r = catalog.find((r) => r.module === module)!;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/workbook');
  await page.getByLabel('Модуль сборника 2026').selectOption(module);
  await page.getByLabel('Печатная страница', { exact: true }).fill(String(r.bookPage));
  await page.getByLabel('Номер упражнения', { exact: true }).fill(String(r.number));
  await expect(page.locator('[data-source-exercise]')).toHaveCount(1);
  await page.locator('[data-source-exercise] a').click();
  await expect(page.locator('[data-workbook]')).toHaveAttribute(
    'data-workbook',
    r.adaptationIds[0],
  );
  await page.getByRole('button', { name: 'Подготовиться к заданию', exact: true }).click();
  const prep = page.getByRole('dialog', { name: 'Подготовка к заданию' });
  await expect(prep).toBeVisible();
  await prep.getByRole('button', { name: 'Закрыть подготовку' }).click();
  const response = page.waitForResponse(
    (r) => r.url().includes('/audio/') && [200, 206].includes(r.status()),
  );
  await page.locator('[data-workbook] button').filter({ hasText: /♫/ }).first().click();
  await response;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
