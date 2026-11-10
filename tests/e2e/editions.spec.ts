import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { WorkbookExercise, WorkbookProgress } from '../../src/workbook/types';
const modern = 'spotlight_workbook_2026_17',
  old = 'spotlight_workbook_2017_6';
const exercises = JSON.parse(
  readFileSync('src/workbook/data/edition-2026-exercises.json', 'utf8'),
) as WorkbookExercise[];
async function complete(page: Page, e: WorkbookExercise) {
  for (const [i, t] of e.tasks.entries()) {
    await expect(page.locator('[data-task]')).toHaveAttribute('data-task', String(i));
    await page.getByRole('radio', { name: t.answers![0], exact: true }).check();
    await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible();
    await expect(page.locator('.wb-feedback .ipa')).toContainText(t.answerIpa!);
    await page.getByRole('button', { name: 'Дальше в упражнении →', exact: true }).click();
  }
  await expect(
    page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
  ).toBeVisible();
}
async function records(page: Page) {
  return page.evaluate(
    () =>
      new Promise<WorkbookProgress[]>((resolve) => {
        const r = indexedDB.open('english-spot');
        r.onsuccess = () => {
          const db = r.result;
          const get = db.transaction('workbook').objectStore('workbook').getAll();
          get.onsuccess = () => {
            resolve(get.result);
            db.close();
          };
        };
      }),
  );
}
test('по умолчанию 2026: оглавление, модуль, урок, страница и неизвестный номер', async ({
  page,
}) => {
  await page.goto('#/textbook');
  await expect(page.getByLabel('Издание сборника')).toHaveValue(modern);
  await expect(page.locator('[data-edition-section]')).toHaveCount(9);
  await expect(page.locator('[data-edition-section="module_1"]')).toContainText('18–27');
  await expect(page.locator('[data-edition-section="module_8"]')).toContainText(
    'с 126; конец не подтверждён',
  );
  await page.getByLabel('Печатная страница', { exact: true }).fill('102');
  await expect(page.locator('[data-source]')).toHaveCount(2);
  await expect(page.locator('[data-edition-section]')).toContainText('Модуль 6');
  await page.getByLabel('Номер упражнения', { exact: true }).fill('1');
  await expect(page.locator('[data-source]')).toHaveCount(0);
  await expect(page.getByText(/Точный номер упражнения 1/)).toBeVisible();
  await page.getByLabel('Номер упражнения', { exact: true }).clear();
  await page.getByLabel('Печатная страница', { exact: true }).clear();
  await page.getByLabel('Урок или тема').fill('past-simple');
  await expect(page.locator('[data-source]')).toHaveCount(2);
  await page.getByLabel('Урок или тема').clear();
  await page.getByLabel('Модуль сборника 2026').selectOption('8');
  await expect(page.locator('[data-source]')).toHaveCount(0);
  await expect(
    page.getByText('Подтверждённых тренировок по такому запросу пока нет.'),
  ).toBeVisible();
});
for (const e of exercises)
  test('2026 полное прохождение: ' + e.id, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('#/workbook/' + e.id);
    await expect(page.getByText(/Авторская тренировка по теме из отчёта/)).toBeVisible();
    await complete(page, e);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
    ).toBeVisible();
    expect((await records(page)).find((p) => p.sourceId === modern)?.completed).toContain(e.id);
    expect(errors).toEqual([]);
  });
test('новый урок: подготовка возвращает к вопросу; три подсказки и помощь не дают независимый успех', async ({
  page,
}) => {
  await page.goto('#/workbook/wb26-past-question');
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await page.getByRole('button', { name: 'Подготовиться к заданию', exact: true }).click();
  const prep = page.getByRole('dialog', { name: 'Подготовка к заданию' });
  await expect(prep).toBeVisible();
  await prep.getByRole('button', { name: 'Закрыть подготовку' }).click();
  for (const title of ['Начни со слов', 'Вспомни смысл', 'Действуй по шагам']) {
    await page.getByRole('button', { name: 'Нужна подсказка', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('radio', { name: 'Did you play?', exact: true }).check();
  await page.getByRole('button', { name: 'Проверить ответ', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Получилось!', exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await records(page)).find((p) => p.sourceId === modern)?.grammar['past-did']?.hinted,
    )
    .toBe(1);
  expect(
    (await records(page)).find((p) => p.sourceId === modern)?.grammar['past-did'].independent,
  ).toBe(0);
});
test('словарь 2026: только подтверждённые формы, IPA, источник без выдуманного номера и реальный MP3', async ({
  page,
}) => {
  await page.goto('#/dictionary');
  await expect(page.getByLabel('Издание сборника')).toHaveValue(modern);
  await page.getByLabel('Вид словаря').selectOption('forms');
  await expect(page.locator('.wb-form')).toHaveCount(6);
  await page.getByLabel('Слово сборника или перевод').fill('did');
  await expect(page.locator('.wb-form')).toHaveCount(2);
  const did = page
    .locator('.wb-form')
    .filter({ has: page.locator('h3', { hasText: /^didНе изучено$/ }) });
  const response = page.waitForResponse(
    (r) => r.url().includes('/audio/workbook/') && [200, 206].includes(r.status()),
  );
  await page.getByRole('button', { name: '♫ did', exact: true }).click();
  await response;
  await expect(page.locator('.ipa').first()).toHaveText('/dɪd/');
  await page
    .locator('.wb-form')
    .first()
    .getByText('Подтверждённые места в сборнике', { exact: true })
    .click();
  await expect(page.locator('.wb-form').first()).toContainText('82–83 · номер не проверен');
  await page.getByLabel('Издание сборника').selectOption(old);
  await page.getByLabel('Вид словаря').selectOption('forms');
  await page.getByLabel('Слово сборника или перевод').fill('books');
  await expect(page.locator('.wb-form')).toHaveCount(1);
  await expect(page.locator('.wb-form .ipa')).toHaveText('/bʊks/');
  const book = JSON.parse(readFileSync('src/workbook/data/lexicon.json', 'utf8')).find(
    (w: { form: string }) => w.form === 'book',
  );
  await page.goto('#/dictionary?source=workbook&form=' + book.id);
  await expect(page.getByLabel('Издание сборника')).toHaveValue(old);
  await expect(page.locator('.wb-form').first()).toContainText('book');
});
test('миграция браузера v4: старое завершение сохраняется; новое прохождение и экспорт отделены', async ({
  page,
}) => {
  const oldExercise = JSON.parse(
    readFileSync('src/workbook/data/module-one.json', 'utf8'),
  )[0] as WorkbookExercise;
  const saved: WorkbookProgress = {
    schemaVersion: 1,
    sourceId: 'bykova-pospelova-2017-workbook-3',
    currentId: oldExercise.id,
    positions: { [oldExercise.id]: oldExercise.tasks.length },
    completed: [oldExercise.id],
    words: {},
    grammar: {},
    meaning: {},
    attempts: [],
    hintCount: 3,
    reviewIds: [],
    seconds: 60,
    preparations: {},
    updatedAt: 10,
  };
  await page.addInitScript((record) => {
    const r = indexedDB.open('english-spot', 40);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [name, key] of [
        ['progress', 'lessonId'],
        ['preferences', 'key'],
        ['reader', 'sceneId'],
        ['workbook', 'sourceId'],
      ])
        db.createObjectStore(name, { keyPath: key });
    };
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('workbook', 'readwrite');
      tx.objectStore('workbook').put(record);
      tx.oncomplete = () => db.close();
    };
  }, saved);
  await page.goto('#/workbook');
  await expect(page.getByLabel('Издание сборника')).toHaveValue(modern);
  await page.getByLabel('Издание сборника').selectOption(old);
  await page.getByRole('link', { name: 'Продолжить сборник →', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Упражнение выполнено!', exact: true }),
  ).toBeVisible();
  await page.goto('#/workbook/' + exercises[0].id);
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await complete(page, exercises[0]);
  const all = await records(page);
  expect(all.find((p) => p.sourceId === old)?.hintCount).toBe(3);
  expect(all.find((p) => p.sourceId === old)?.completed).toEqual([oldExercise.id]);
  expect(all.find((p) => p.sourceId === modern)?.completed).toEqual([exercises[0].id]);
  await page.goto('#/parents');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '↓ Экспортировать прогресс', exact: true }).click();
  const file = await download;
  const backup = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(backup.workbook.map((p: WorkbookProgress) => p.sourceId).sort()).toEqual(
    [old, modern].sort(),
  );
});
test('мобильная навигация 2026 и возврат в старые комиксы', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/textbook');
  await expect(page.getByLabel('Издание сборника')).toHaveValue(modern);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .getByRole('link', { name: 'Комиксы учебника, часть 1 — отдельный источник →' })
    .click();
  await expect(page.getByRole('heading', { name: /Учебник оживает/ })).toBeVisible();
  await expect(page.locator('.book-card')).toHaveCount(11);
  await page.screenshot({ path: '/tmp/edition2026-mobile.png' });
});

test('слово прежнего источника из новой тренировки доступно в повторении с честной редакцией', async ({
  page,
}) => {
  await page.goto('#/workbook/wb26-there-past');
  await expect(page.locator('[data-task]')).toHaveAttribute('data-task', '0');
  await page.getByRole('button', { name: /\? Подсказки/ }).click();
  await page.getByRole('button', { name: 'book', exact: true }).first().click();
  const help = page.getByRole('dialog', { name: 'Подсказка к слову' });
  await expect(help).toContainText('Источник слова: сборник 2017');
  await help.getByRole('button', { name: 'Добавить в повторение', exact: true }).click();
  await help.getByRole('button', { name: 'Закрыть подсказку' }).click();
  await page.goto('#/dictionary?source=workbook');
  await expect(page.getByLabel('Издание сборника')).toHaveValue(modern);
  await page.getByRole('button', { name: 'Повторить сложные слова (1)', exact: true }).click();
  const review = page.locator('.wb-word-review');
  await expect(review).toContainText('Источник слова: 6-е изд., 2017');
  await review.getByRole('radio', { name: 'книга', exact: true }).check();
  await review.getByRole('button', { name: 'Проверить слово', exact: true }).click();
  await expect(review.getByText('Верно!', { exact: true })).toBeVisible();
  const book = JSON.parse(readFileSync('src/workbook/data/lexicon.json', 'utf8')).find(
    (w: { form: string }) => w.form === 'book',
  );
  await expect
    .poll(
      async () =>
        (await records(page)).find((p) => p.sourceId === modern)?.words[book.id]?.independent,
    )
    .toBe(1);
});
