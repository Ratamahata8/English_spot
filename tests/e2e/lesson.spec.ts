import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Lesson } from '../../src/types';
const lesson = JSON.parse(readFileSync('src/lessons/school.json', 'utf8')) as Lesson;
async function choosePieces(page: Page, pieces: string[]) {
  for (const piece of pieces)
    await page
      .locator('.tile-bank .tile:not(:disabled)')
      .filter({ hasText: new RegExp(`^${piece}$`) })
      .filter({ visible: true })
      .first()
      .click();
}
test('первый урок целиком: ошибка, подсказки, перезагрузка, мини-урок, повторение', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('');
  await page.getByRole('link', { name: /Начать обучение/ }).click();
  for (let i = 0; i < lesson.exercises.length; i++) {
    const e = lesson.exercises[i];
    await expect(page.getByRole('heading', { name: e.prompt, exact: true })).toBeVisible();
    if (i === 0) {
      await page.getByRole('button', { name: 'Подсказки', exact: false }).click();
      await page.locator('.english-title .word-token').click();
      await expect(page.getByRole('dialog', { name: 'Подсказка к слову' })).toBeVisible();
      await page.getByRole('button', { name: 'Добавить в повторение', exact: true }).click();
      await page.getByRole('button', { name: 'Закрыть подсказку' }).click();
      await page.getByRole('button', { name: 'Нажми на слово', exact: false }).click();
      await page.getByRole('button', { name: 'Послушать: school', exact: true }).click();
      await expect(page.locator('.audio-error')).toHaveCount(0);
    }
    if (e.type === 'study') {
      await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
    } else {
      if (e.type === 'picture' || e.type === 'word') {
        if (i === 8) {
          await page
            .locator('.option')
            .filter({ has: page.locator('img[alt="школьный портфель"]') })
            .click();
          await page.getByRole('button', { name: 'Проверить', exact: true }).click();
          await expect(page.getByText('Давай попробуем ещё раз', { exact: true })).toBeVisible();
          await page.getByRole('button', { name: 'Открыть помощь' }).click();
          await page.getByRole('button', { name: '2 · Смысл' }).click();
          await expect(page.getByRole('region', { name: 'Помощь с заданием' })).toBeVisible();
          await page.getByRole('button', { name: 'Закрыть помощь' }).click();
        }
        await page.locator(`[data-option="${e.answer}"]`).click();
      } else {
        const pieces =
          e.type === 'letters' ? e.answer.split('') : e.answer.replace('.', '').split(' ');
        if (e.type === 'sentence' && e.wordId === 'school-bag') {
          for (let n = 0; n < 2; n++) {
            await choosePieces(page, ['my', 'This', 'is', 'school', 'bag']);
            await page.getByRole('button', { name: 'Проверить', exact: true }).click();
            if (n === 0) {
              while (await page.locator('.answer-tray button').count())
                await page.locator('.answer-tray button').last().click();
            }
          }
          await expect(page.getByRole('dialog', { name: 'Мини-урок' })).toBeVisible();
          await page.getByRole('dialog').getByRole('button', { name: 'my', exact: true }).click();
          await page.getByRole('button', { name: 'Проверить мини-задание' }).click();
          await expect(page.getByText('Верно! Вернёмся к заданию.')).toBeVisible();
          await page.getByRole('button', { name: 'Вернуться к заданию', exact: true }).click();
          while (await page.locator('.answer-tray button').count())
            await page.locator('.answer-tray button').last().click();
        }
        await choosePieces(page, pieces);
      }
      await page.getByRole('button', { name: 'Проверить', exact: true }).click();
      await expect(page.getByText('Отлично, получилось! ✨', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
    }
    if (i === 3) {
      await expect(page.locator('.english-title')).toHaveText('rubber');
      // Wait for the completed exercise transaction, then reload the next task.
      await page.waitForFunction(async () => {
        return await new Promise((resolve) => {
          const request = indexedDB.open('english-spot');
          request.onsuccess = () => {
            const db = request.result;
            const read = db.transaction('progress').objectStore('progress').get('school-1a');
            read.onsuccess = () => {
              resolve(read.result?.currentExerciseId === 'school-1a-study-rubber');
              db.close();
            };
          };
        });
      });
      await page.reload();
      await expect(
        page.getByRole('heading', { name: lesson.exercises[4].prompt, exact: true }),
      ).toBeVisible();
      await expect(page.locator('.english-title')).toHaveText('rubber');
    }
  }
  await expect(page.getByRole('heading', { name: 'Урок пройден!' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Урок пройден!' })).toBeVisible();
  await page.goto('#/parents');
  await expect(page.getByRole('heading', { name: 'Родительский кабинет' })).toBeVisible();
  await page.getByRole('link', { name: 'Повторить ошибки →' }).click();
  // These two words received the deliberate errors above. Wait for the actual
  // review task after routing; an immediate DOM count can still see the parent screen.
  for (const id of ['school', 'school-bag']) {
    await expect(page.locator('.exercise')).toHaveAttribute('data-exercise', 'review-' + id);
    const w = lesson.vocabulary.find((w) => w.id === id)!;
    await page.locator(`[data-option="${w.en}"]`).click();
    await page.getByRole('button', { name: 'Проверить', exact: true }).click();
    await expect(page.getByText('Отлично, получилось! ✨', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Повторение завершено!' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('мобильный экран, поиск, настройки, экспорт и импорт', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('');
  await expect(page.getByRole('heading', { name: /Привет, исследователь/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Словарь', exact: true }).click();
  await page.getByRole('textbox', { name: 'Найти слово' }).fill('пенал');
  await expect(page.locator('.word-card')).toHaveCount(1);
  await expect(page.locator('.word-name')).toHaveText('pencil case');
  await page.goto('#/parents');
  await page.getByLabel('Отключить анимации').check();
  await page.reload();
  await expect(page.getByLabel('Отключить анимации')).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Экспортировать прогресс', exact: false }).click();
  const file = await download;
  const path = await file.path();
  expect(path).toBeTruthy();
  page.on('dialog', (d) => d.accept());
  await page.getByLabel('Импортировать JSON', { exact: true }).setInputFiles(path!);
  await expect(page.getByText('Прогресс восстановлен.')).toBeVisible();
  await page.getByLabel('Импортировать JSON', { exact: true }).setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":999}'),
  });
  await expect(page.getByText('Неподдерживаемая версия или неверные задания.')).toBeVisible();
});
test('клавиатура и длинное нажатие открывают словарную помощь', async ({ page }) => {
  await page.goto('#/dictionary');
  await page.getByRole('button', { name: 'Подсказки', exact: false }).click();
  const word = page.locator('.word-name .word-token').first();
  await word.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Нажми на слово', exact: false }).click();
  await word.dispatchEvent('pointerdown');
  await page.waitForTimeout(650);
  await word.dispatchEvent('pointerup');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('служебное слово из подсказки попадает в рабочее повторение', async ({ page }) => {
  await page.goto('#/basics');
  await page.getByRole('button', { name: 'Подсказки', exact: false }).click();
  await page.locator('.english-title .word-token').filter({ hasText: /^my$/ }).click();
  await page.getByRole('button', { name: 'Добавить в повторение', exact: true }).click();
  await page.getByRole('button', { name: 'Закрыть подсказку' }).click();
  await page.getByRole('button', { name: 'Нажми на слово', exact: false }).click();
  await page.goto('#/learn?review=1');
  await expect(page.getByRole('heading', { name: 'Вспомни значение слова' })).toBeVisible();
  await page.locator('[data-option="мой, моя, моё"]').click();
  await page.getByRole('button', { name: 'Проверить', exact: true }).click();
  await expect(page.getByText('Отлично, получилось! ✨', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Повторение завершено!' })).toBeVisible();
});

test('готовые аудио и изображения загружаются; скорость и остановка звука работают', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const audios: HTMLAudioElement[] = [];
    Object.defineProperty(window, '__testAudio', { value: audios });
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(src?: string) {
        super(src);
        audios.push(this);
      }
    };
  });
  await page.goto('#/learn');
  await page.getByRole('button', { name: 'Послушать: school', exact: true }).click();
  await page.waitForFunction(() =>
    (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio.some(
      (a) => a.currentTime > 0,
    ),
  );
  await page.getByLabel('Медленно · 0.75×').check();
  await page.getByRole('button', { name: 'Послушать: school', exact: true }).click();
  expect(
    await page.evaluate(() => {
      const a = (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio.at(-1)!;
      return { rate: a.playbackRate, pitch: a.preservesPitch };
    }),
  ).toEqual({ rate: 0.75, pitch: true });
  await page.getByRole('button', { name: 'Дальше →', exact: true }).click();
  await expect(page.locator('.english-title')).toHaveText('school bag');
  expect(
    await page.evaluate(() =>
      (window as unknown as { __testAudio: HTMLAudioElement[] }).__testAudio.every((a) => a.paused),
    ),
  ).toBe(true);
  const manifestResponse = await page.request.get('audio/en-GB/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = (await manifestResponse.json()) as Record<string, { path: string }>;
  for (const asset of Object.values(manifest)) {
    const response = await page.request.get('audio/en-GB/' + asset.path);
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeGreaterThan(500);
  }
  for (const w of lesson.vocabulary) {
    const response = await page.request.get(w.image);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');
  }
});
