import { expect, type Page } from '@playwright/test';
import type { Task } from '../../../src/workbook/types';
export async function solve(page: Page, task: Task) {
  if (task.mode === 'text')
    await page.getByLabel('Твой ответ', { exact: true }).fill(task.answers![0]);
  if (task.mode === 'choice')
    await page.getByRole('radio', { name: task.answers![0], exact: true }).check();
  if (task.mode === 'matching')
    for (const [i, row] of task.rows!.entries())
      await page.getByLabel('Пара ' + (i + 1), { exact: true }).selectOption(row.answers[0]);
  if (task.mode === 'template')
    for (const slot of task.slots!)
      await page.getByLabel(slot.label, { exact: true }).selectOption(slot.options[0]);
  if (task.mode === 'order') {
    const parts = task.answers![0].includes(' | ')
        ? task.answers![0].split(' | ')
        : task.answers![0].split(' '),
      taken = new Set<number>();
    for (const part of parts) {
      const i = task.tokens!.findIndex((token, index) => token === part && !taken.has(index));
      taken.add(i);
      await page.locator('.wb-token-bank button').nth(i).click();
    }
  }
  if (task.mode === 'wordsearch')
    for (const placement of task.placements!) {
      for (const [i, label] of [
        'Начало: строка',
        'Начало: столбец',
        'Конец: строка',
        'Конец: столбец',
      ].entries())
        await page
          .getByLabel(label, { exact: true })
          .selectOption(String([...placement.start, ...placement.end][i] + 1));
      await page.getByRole('button', { name: 'Найти слово по координатам', exact: true }).click();
    }
  if (task.mode === 'crossword')
    for (const [i, word] of task.words!.entries())
      await page.getByLabel('Кроссворд ' + (i + 1), { exact: true }).fill(word.answer);
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: task.mode === 'template' ? 'Твой вариант собран!' : 'Получилось!',
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Дальше в упражнении →', exact: true }).click();
}
