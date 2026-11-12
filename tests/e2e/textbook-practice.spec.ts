import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { PracticeUnit, PracticeTask } from '../../src/textbook2026';
test.describe.configure({ mode: 'parallel' });
const units = JSON.parse(readFileSync('src/textbook2026/practice.json', 'utf8')) as PracticeUnit[];
async function solve(page: Page, t: PracticeTask) {
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', t.id);
  if (t.type === 'choice')
    await page
      .locator('[data-answer]')
      .filter({ hasText: new RegExp('^' + t.answer!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') })
      .click();
  if (t.type === 'input')
    await page.getByRole('textbox', { name: 'Твой ответ', exact: true }).fill(t.answer!);
  if (t.type === 'order')
    for (const token of t.tokens!)
      await page
        .locator('[data-tile]:not(:disabled)')
        .filter({ hasText: new RegExp('^' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') })
        .first()
        .click();
  if (t.type === 'matching')
    for (const pair of t.pairs!)
      await page.getByLabel('Пара: ' + pair.en, { exact: true }).selectOption(pair.ru);
  if (t.type === 'personal') {
    const inputs = page.locator('.tb-personal input');
    for (let i = 0; i < t.fields!.length; i++)
      await inputs.nth(i).fill(t.fields![i] === 'age' ? '9' : 'Alex');
  }
  await page
    .getByRole('button', {
      name: t.type === 'personal' ? 'Сохранить мой вариант' : 'Проверить ответ',
      exact: true,
    })
    .click();
  await expect(page.getByRole('button', { name: 'Дальше →', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
}
for (const unit of units)
  test('актуальный учебник: ' + unit.id, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`#/textbook/2026/p${unit.page}?exercise=${unit.id}`);
    for (const t of unit.tasks) await solve(page, t);
    await expect(
      page.getByRole('heading', { name: 'Занятие пройдено!', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Пройдено раз: 1/)).toBeVisible();
    expect(errors).toEqual([]);
  });
test('ошибка, простой пример, продолжение после reload, повторение и второй проход учебника', async ({
  page,
}) => {
  const unit = units.find((u) => u.id === 'tb26-p38-e1')!;
  await page.goto('#/textbook/2026/p38');
  await page.getByRole('textbox', { name: 'Твой ответ', exact: true }).fill('were');
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Попробуй ещё раз');
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Разберём на простом примере' })).toBeVisible();
  await expect(page.getByText('Шаг 1 из 3 · Пройдено раз: 0', { exact: true })).toBeVisible();
  await page.locator('.tb-help').getByRole('button', { name: 'were', exact: true }).click();
  await page.getByRole('button', { name: 'Вернуться к заданию', exact: true }).click();
  await page.getByRole('textbox', { name: 'Твой ответ', exact: true }).fill('was');
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Дальше →', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  for (const t of unit.tasks.slice(1)) await solve(page, t);
  await page.getByRole('button', { name: /Повторить сложное/ }).click();
  await solve(page, unit.tasks[0]);
  await expect(page.getByRole('heading', { name: 'Повторение завершено!' })).toBeVisible();
  await page.getByRole('button', { name: 'Пройти ещё раз →', exact: true }).click();
  for (const t of unit.tasks) await solve(page, t);
  await expect(page.getByText(/Пройдено раз: 2/)).toBeVisible();
  await page.goto('#/parents');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспортировать прогресс', exact: false }).click();
  const download = await pending;
  const data = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(
    data.textbookPractice.find((p: { unitId: string }) => p.unitId === unit.id).completedRuns,
  ).toBe(2);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Импортировать JSON', { exact: true }).setInputFiles({
    name: 'textbook-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(page.getByText('Прогресс восстановлен.', { exact: true })).toBeVisible();
  await page.goto('#/textbook/2026/p38');
  await expect(page.getByText(/Пройдено раз: 2/)).toBeVisible();
});
test('учебник доступен с мобильного меню и продолжение упражнения 40–41 не дублирует прогресс', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/textbook');
  await page.getByRole('textbox', { name: 'Найти страницу учебника' }).fill('41');
  await page.getByRole('link', { name: 'Открыть страницу 41 →', exact: true }).click();
  await page.getByRole('button', { name: 'Упражнение 5', exact: true }).click();
  await expect(page.locator('[data-unit]')).toHaveAttribute('data-unit', 'tb26-p40-e5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '/tmp/english-spot-2026-mobile.png', fullPage: true });
});
