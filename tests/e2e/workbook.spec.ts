import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { WorkbookExercise, Task, Skill } from '../../src/workbook/types';
const exercises = JSON.parse(
  readFileSync('src/workbook/data/module-one.json', 'utf8'),
) as WorkbookExercise[];
const skills = JSON.parse(readFileSync('src/workbook/data/skills.json', 'utf8')) as Skill[];
async function solve(page: Page, task: Task) {
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
for (const exercise of exercises)
  test('сборник целиком: ' + exercise.id + ' ' + exercise.title, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('#/workbook/' + exercise.id);
    for (const [i, task] of exercise.tasks.entries()) {
      await expect(page.locator('[data-workbook]')).toHaveAttribute('data-workbook', exercise.id);
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
    expect(errors).toEqual([]);
  });
test('ошибки → подходящая подготовка → исходное задание; нет фиктивных словарных успехов', async ({
  page,
}) => {
  await page.goto('#/workbook/wb-1-2a-2b-5');
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  for (const wrong of ['are', 'is']) {
    await page.getByRole('radio', { name: wrong, exact: true }).check();
    await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  }
  const dialog = page.getByRole('dialog', { name: 'Подготовка к заданию' });
  await expect(dialog).toBeVisible();
  for (const id of ['vocabulary', 'pronouns']) {
    const skill = skills.find((s) => s.id === id)!;
    await expect(dialog.getByRole('heading', { name: skill.title, exact: true })).toBeVisible();
    for (const [i, q] of skill.practice!.entries()) {
      await dialog.getByRole('radio', { name: q.answer, exact: true }).check();
      await dialog.getByRole('button', { name: 'Проверить тренировку', exact: true }).click();
      await expect(
        dialog.getByText('Верно! Можно двигаться дальше.', { exact: true }),
      ).toBeVisible();
      await dialog
        .getByRole('button', {
          name: i === 1 && id === 'pronouns' ? 'Вернуться к заданию' : 'Дальше в подготовке',
          exact: true,
        })
        .click();
    }
  }
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await page.getByRole('radio', { name: 'am', exact: true }).check();
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible();
  const saved = await page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const request = indexedDB.open('english-spot');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction('workbook')
            .objectStore('workbook')
            .get('spotlight_workbook_2017_6');
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
        };
      }),
  );
  expect(saved.words).toEqual({});
  expect(saved.grammar.be.independent).toBe(0);
  expect(saved.grammar.be.hinted).toBe(1);
  expect(saved.preparations.pronouns).toBe(1);
});
test('словарь: формы, IPA, контекст, реальный звук, помощь и повторение', async ({ page }) => {
  await page.goto('#/dictionary?source=workbook&edition=spotlight_workbook_2017_6');
  await page.getByLabel('Слово сборника или перевод').fill('books');
  await page.getByLabel('Вид словаря').selectOption('forms');
  const form = page.locator('.wb-form');
  await expect(form).toHaveCount(1);
  await expect(form.locator('.ipa')).toHaveText('/bʊks/');
  const response = page.waitForResponse(
    (r) => r.url().includes('/audio/workbook/en-GB/') && [200, 206].includes(r.status()),
  );
  await form.getByRole('button', { name: '♫ books', exact: true }).click();
  await response;
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: /\? Подсказки/ }).click();
  await form.locator('h3 .word-token').click();
  const help = page.getByRole('dialog', { name: 'Подсказка к слову' });
  await expect(help.getByRole('heading', { name: 'books', exact: true })).toBeVisible();
  await help.getByRole('button', { name: 'Добавить в повторение', exact: true }).click();
  await help.getByRole('button', { name: 'Закрыть подсказку' }).click();
  await page.getByRole('button', { name: /Повторить сложные слова/ }).click();
  await page.getByRole('radio', { name: 'книги', exact: true }).check();
  await page.getByRole('button', { name: 'Проверить слово', exact: true }).click();
  await expect(page.getByText('Верно!', { exact: true })).toBeVisible();
});
test('продолжение шага, повторный проход и резервная копия сохраняют существующие данные', async ({
  page,
}) => {
  const exercise = exercises.find((e) => e.id === 'wb-1-1a-1b-2')!;
  await page.goto('#/workbook/' + exercise.id);
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await solve(page, exercise.tasks[0]);
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '1');
  // Wait on persisted data, as a user can navigate while an autosave is pending.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open('english-spot');
            request.onsuccess = () => {
              const db = request.result,
                read = db
                  .transaction('workbook')
                  .objectStore('workbook')
                  .get('spotlight_workbook_2017_6');
              read.onsuccess = () => {
                resolve(read.result?.positions['wb-1-1a-1b-2'] ?? -1);
                db.close();
              };
            };
          }),
      ),
    )
    .toBe(1);
  await page.reload();
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '1');
  await page.goto('#/parents');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '↓ Экспортировать прогресс' }).click();
  const download = await downloaded;
  const backup = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(backup.workbook[0].positions[exercise.id]).toBe(1);
  expect(backup.schemaVersion).toBe(2);
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Сбросить весь прогресс' }).click();
  await expect(page.getByText('Прогресс сброшен.', { exact: true })).toBeVisible();
  await page.getByLabel('Импортировать JSON').setInputFiles({
    name: 'progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText('Прогресс восстановлен.', { exact: true })).toBeVisible();
  await page.goto('#/workbook/' + exercise.id);
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '1');
});
test('мобильный выбор страницы, неготовые задания и сетка без выхода за экран', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/workbook?edition=spotlight_workbook_2017_6');
  await page.getByLabel('Печатная страница').fill('13');
  await expect(page.locator('.wb-catalog-card')).toHaveCount(3);
  await page.getByLabel('Раздел сборника').selectOption('2');
  const planned = page.locator('[data-source="wb-2-3a-3b-1"]');
  await expect(planned.getByText('В плане', { exact: true })).toBeVisible();
  await expect(planned.getByRole('link')).toHaveCount(0);
  await page.goto('#/workbook/wb-2-3a-3b-1');
  await expect(page.getByRole('heading', { name: 'Это упражнение ещё готовится' })).toBeVisible();
  await page.goto('#/workbook/wb-1-1a-1b-9');
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await page.getByRole('button', { name: 'Крупная сетка', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/workbook-mobile.png', fullPage: true });
});
test('подготовка есть и в прежних упражнениях и возвращает к тому же вопросу', async ({ page }) => {
  await page.goto('#/learn/school-1a');
  const exercise = page.locator('[data-exercise]');
  const id = await exercise.getAttribute('data-exercise');
  await page.getByRole('button', { name: 'Подготовиться к заданию', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Подготовка к заданию' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Уже понятно — к заданию' }).click();
  await expect(exercise).toHaveAttribute('data-exercise', id!);
});
test('все MP3 сборника доступны по базовому пути GitHub Pages', async ({ request, baseURL }) => {
  const manifest = JSON.parse(
    readFileSync('public/audio/workbook/en-GB/manifest.json', 'utf8'),
  ) as Record<string, { path: string }>;
  for (const asset of Object.values(manifest)) {
    const response = await request.get(`${baseURL}audio/workbook/en-GB/${asset.path}`);
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeGreaterThan(500);
  }
});

async function savedWorkbook(page: Page) {
  return page.evaluate(
    () =>
      new Promise<import('../../src/workbook/types').WorkbookProgress>((resolve) => {
        const request = indexedDB.open('english-spot');
        request.onsuccess = () => {
          const db = request.result;
          const read = db
            .transaction('workbook')
            .objectStore('workbook')
            .get('spotlight_workbook_2017_6');
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
        };
      }),
  );
}
test('ошибка хранилища блокирует завершение до успешного повторного сохранения', async ({
  page,
}) => {
  const exercise = exercises[0];
  await page.goto('#/workbook/' + exercise.id);
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  for (const [i, row] of exercise.tasks[0].rows!.entries())
    await page.getByLabel('Пара ' + (i + 1), { exact: true }).selectOption(row.answers[0]);
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as unknown as { restorePut: () => void }).restorePut = () => {
      IDBObjectStore.prototype.put = original;
    };
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof original>) {
      if (this.name === 'workbook') throw new DOMException('Test quota', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Дальше в упражнении →', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Повторить сохранение', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Следующее упражнение →' })).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { restorePut: () => void }).restorePut());
  await page.getByRole('button', { name: 'Повторить сохранение', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
  ).toBeVisible();
});
test('подсказка при словарном повторении не даёт самостоятельного освоения', async ({ page }) => {
  await page.goto('#/dictionary?source=workbook&edition=spotlight_workbook_2017_6');
  await page.getByLabel('Слово сборника или перевод').fill('books');
  await page.getByLabel('Вид словаря').selectOption('forms');
  await page
    .locator('.wb-form')
    .getByRole('button', { name: '+ В повторение', exact: true })
    .click();
  await page.getByRole('button', { name: /Повторить сложные слова/ }).click();
  const review = page.locator('.wb-word-review');
  await page.getByRole('button', { name: /\? Подсказки/ }).click();
  await review.locator('.word-token').click();
  await page.getByRole('button', { name: 'Закрыть подсказку' }).click();
  await review.getByRole('radio', { name: 'книги', exact: true }).check();
  await review.getByRole('button', { name: 'Проверить слово' }).click();
  await expect.poll(async () => (await savedWorkbook(page))?.attempts.at(-1)?.hinted).toBe(true);
  const saved = await savedWorkbook(page);
  expect(Object.values(saved.words).some((k) => k.hinted === 1 && k.independent === 0)).toBe(true);
  expect(saved.reviewIds.length).toBe(1);
});
test('старые подсказки после перезагрузки первого шага не делают новый ответ подсказанным', async ({
  page,
}) => {
  await page.goto('#/workbook/' + exercises[0].id);
  await page.getByRole('button', { name: /\? Подсказки/ }).click();
  await page.getByRole('button', { name: 'book', exact: true }).first().click();
  await page.getByRole('button', { name: 'Закрыть подсказку' }).click();
  await expect.poll(async () => (await savedWorkbook(page))?.hintCount).toBe(1);
  await page.reload();
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await solve(page, exercises[0].tasks[0]);
  await expect.poll(async () => (await savedWorkbook(page))?.attempts.at(-1)?.hinted).toBe(false);
});
