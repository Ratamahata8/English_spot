import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import type { Lesson, LearningProgress } from '../../src/types';
const lessons = readdirSync('src/lessons/content')
  .filter((n) => n.endsWith('.json'))
  .map((n) => JSON.parse(readFileSync('src/lessons/content/' + n, 'utf8')) as Lesson);
async function finish(page: Page, lesson: Lesson) {
  for (const e of lesson.exercises) {
    await expect(page.locator('.exercise')).toHaveAttribute('data-exercise', e.id);
    if (e.type === 'study') {
      await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
      continue;
    }
    if (e.type === 'picture' || e.type === 'word')
      await page.locator(`[data-option="${e.answer}"]`).click();
    else {
      const parts = e.type === 'letters' ? [...e.answer] : e.answer.replace('.', '').split(' ');
      for (const part of parts) {
        const pattern = new RegExp('^' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
        await page
          .locator('.tile-bank .tile:not(:disabled)')
          .filter({ hasText: pattern })
          .first()
          .click();
      }
    }
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await expect(page.getByText('Отлично, получилось! ✨', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Урок пройден!' })).toBeVisible();
}
for (const lesson of lessons)
  test('полное прохождение: ' + lesson.title, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('#/learn/' + lesson.id);
    await finish(page, lesson);
    await expect(page.getByText(/Пройдено раз: 1/)).toBeVisible();
    expect(errors).toEqual([]);
  });
test('два прохода, переключение тем, перезагрузка и экспорт всей программы', async ({ page }) => {
  const lesson = lessons.find((l) => l.id === 'shapes')!;
  await page.goto('#/learn/shapes');
  await finish(page, lesson);
  await page.getByRole('button', { name: 'Пройти ещё раз →', exact: true }).click();
  await finish(page, lesson);
  await expect(page.getByText(/Пройдено раз: 2/)).toBeVisible();
  await page.goto('#/learn/subjects');
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  await expect(page.locator('.english-title')).toHaveText('Maths');
  await page.goto('#/curriculum');
  await expect(page.locator('[data-lesson="shapes"]')).toContainText('Пройдено раз: 2');
  await page
    .locator('[data-lesson="subjects"]')
    .getByRole('button', { name: 'Продолжить →' })
    .click();
  await expect(page.locator('.english-title')).toHaveText('Maths');
  await page.reload();
  await expect(page.locator('.english-title')).toHaveText('Maths');
  await page.goto('#/parents');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспортировать прогресс', exact: false }).click();
  const download = await pending;
  const path = await download.path();
  const data = JSON.parse(readFileSync(path!, 'utf8')) as {
    schemaVersion: number;
    lessons: LearningProgress[];
  };
  expect(data.schemaVersion).toBe(2);
  expect(data.lessons.find((p) => p.lessonId === 'shapes')?.completedRuns).toBe(2);
  expect(data.lessons.find((p) => p.lessonId === 'subjects')?.completed).toHaveLength(1);
});
test('старая резервная копия первого урока импортируется без удаления новых тем', async ({
  page,
}) => {
  await page.goto('#/learn/subjects');
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  await expect(page.locator('.english-title')).toHaveText('Maths');
  const first = JSON.parse(readFileSync('src/lessons/school.json', 'utf8')) as Lesson;
  const legacy = {
    schemaVersion: 1,
    lessonId: first.id,
    currentExerciseId: null,
    completed: first.exercises.map((e) => e.id),
    stats: {},
    reviewIds: [],
    sessions: 2,
    seconds: 83,
    hintCount: 0,
    successful: 25,
    lessonComplete: true,
    remedialCount: 0,
    remedialDone: [],
    settings: { slow: false, reduceMotion: false },
    updatedAt: 1,
  };
  await page.goto('#/parents');
  page.on('dialog', (d) => d.accept());
  await page.getByLabel('Импортировать JSON', { exact: true }).setInputFiles({
    name: 'old-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.getByText('Прогресс восстановлен.')).toBeVisible();
  await page.goto('#/curriculum');
  await expect(page.locator('[data-lesson="school-1a"]')).toContainText('Пройдено раз: 1');
  await page
    .locator('[data-lesson="subjects"]')
    .getByRole('button', { name: 'Продолжить →' })
    .click();
  await expect(page.locator('.english-title')).toHaveText('Maths');
});

test('родитель может повторить вручную добавленное слово без прошлых ошибок', async ({ page }) => {
  await page.goto('#/dictionary');
  await page
    .locator('.word-card')
    .filter({ has: page.locator('.word-name').filter({ hasText: /^book$/ }) })
    .getByRole('button', { name: 'Добавить в повторение', exact: false })
    .click();
  await page.goto('#/parents');
  await page.getByRole('link', { name: 'Повторить ошибки →', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Как это называется по-английски?' }),
  ).toBeVisible();
  await page.locator('[data-option="book"]').click();
  await page.getByRole('button', { name: 'Проверить', exact: true }).click();
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Повторение завершено!' })).toBeVisible();
});
