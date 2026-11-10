import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { LearningProgress, Lesson } from '../../src/types';
const lesson = JSON.parse(readFileSync('src/lessons/school.json', 'utf8')) as Lesson;
async function savedProgress(page: Page): Promise<LearningProgress | undefined> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('english-spot');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const read = db.transaction('progress').objectStore('progress').get('school-1a');
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
          read.onerror = () => {
            reject(read.error);
            db.close();
          };
        };
      }),
  );
}
test('время и занятия не начисляются для пустого повторения и уже пройденного урока', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('#/learn?review=1');
  await expect(page.getByRole('heading', { name: 'Повторение завершено!' })).toBeVisible();
  await page.clock.runFor(30000);
  expect(await savedProgress(page)).toBeUndefined();
  await page.goto('#/learn');
  await expect(page.locator('.english-title')).toHaveText('school');
  await expect.poll(async () => (await savedProgress(page))?.sessions).toBe(1);
  await page.goto('#/parents');
  const p = (await savedProgress(page))!;
  const completed = {
    ...p,
    completed: lesson.exercises.map((e) => e.id),
    currentExerciseId: null,
    lessonComplete: true,
    completedRuns: 1,
  };
  page.on('dialog', (d) => d.accept());
  await page.getByLabel('Импортировать JSON', { exact: true }).setInputFiles({
    name: 'completed.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(completed)),
  });
  await expect(page.getByText('Прогресс восстановлен.')).toBeVisible();
  await page.goto('#/learn');
  await expect(page.getByRole('heading', { name: 'Урок пройден!' })).toBeVisible();
  await page.clock.runFor(30000);
  expect(await savedProgress(page)).toMatchObject({
    seconds: completed.seconds,
    sessions: completed.sessions,
  });
});
test('таймер считает активное повторение и останавливается после последнего задания', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('#/dictionary?source=lessons');
  await page
    .locator('.word-card')
    .filter({ has: page.locator('.word-name').filter({ hasText: /^book$/ }) })
    .getByRole('button', { name: 'Добавить в повторение', exact: false })
    .click();
  await page.goto('#/learn?review=1');
  await expect(
    page.getByRole('heading', { name: 'Как это называется по-английски?' }),
  ).toBeVisible();
  await page.clock.runFor(11000);
  await expect.poll(async () => (await savedProgress(page))?.seconds).toBeGreaterThanOrEqual(10);
  await page.locator('[data-option="book"]').click();
  await page.getByRole('button', { name: 'Проверить', exact: true }).click();
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Повторение завершено!' })).toBeVisible();
  await expect.poll(async () => (await savedProgress(page))?.seconds).toBeGreaterThanOrEqual(11);
  const completed = (await savedProgress(page))!;
  await page.clock.runFor(30000);
  expect(await savedProgress(page)).toMatchObject({ seconds: completed.seconds, sessions: 1 });
});
