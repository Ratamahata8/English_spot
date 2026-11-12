import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { VocabularyItem } from '../../src/types';

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

test('девять подтверждённых слов и примеры играют из новых и повторно используемых MP3', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const audios: HTMLAudioElement[] = [];
    Object.defineProperty(window, '__dictionaryAudio', { value: audios });
    const NativeAudio = window.Audio;
    window.Audio = class extends NativeAudio {
      constructor(src?: string) {
        super(src);
        audios.push(this);
      }
    };
  });
  const verified = JSON.parse(readFileSync('docs/textbook-2026/verified-forms.json', 'utf8')) as {
    forms: VocabularyItem[];
  };
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/dictionary?source=lessons');
  for (const w of verified.forms) {
    await page.getByRole('textbox', { name: 'Найти слово' }).fill(w.en);
    const card = page
      .locator('.word-card')
      .filter({ has: page.locator('.word-name', { hasText: new RegExp('^' + w.en + '$') }) });
    await expect(card).toContainText(w.ipa);
    await expect(card).toContainText('стр. ' + w.textbookEvidence!.page);
    for (const [label, text] of [
      ['Послушать', w.en],
      ['Пример', w.example],
    ]) {
      await card.getByRole('button', { name: label + ': ' + text, exact: true }).click();
      await page.waitForFunction(() => {
        const audio = (
          window as unknown as { __dictionaryAudio: HTMLAudioElement[] }
        ).__dictionaryAudio.at(-1);
        return audio && audio.currentTime > 0;
      });
    }
  }
  const played = await page.evaluate(() =>
    (window as unknown as { __dictionaryAudio: HTMLAudioElement[] }).__dictionaryAudio.map((a) => ({
      src: a.src,
      error: a.error?.code,
    })),
  );
  expect(played).toHaveLength(18);
  expect(played.filter((a) => a.src.includes('/workbook/en-GB/'))).toHaveLength(8);
  expect(played.every((a) => !a.error)).toBe(true);
  await page.getByRole('textbox', { name: 'Найти слово' }).fill('who');
  const who = page
    .locator('.word-card')
    .filter({ has: page.locator('.word-name', { hasText: /^who$/ }) });
  await who.getByRole('button', { name: '+ Добавить в повторение', exact: true }).click();
  await page.reload();
  await page.getByRole('textbox', { name: 'Найти слово' }).fill('who');
  await expect(who.getByRole('button', { name: 'В повторении ✓' })).toBeDisabled();
  await page.goto('#/learn');
  await page.getByLabel('Медленно · 0.75×').check();
  await page.goto('#/dictionary?source=lessons');
  await page.getByRole('textbox', { name: 'Найти слово' }).fill('what');
  await page.getByRole('button', { name: 'Послушать: what', exact: true }).click();
  await page.waitForFunction(() => {
    const audio = (
      window as unknown as { __dictionaryAudio: HTMLAudioElement[] }
    ).__dictionaryAudio.at(-1);
    return audio && audio.currentTime > 0;
  });
  expect(
    await page.evaluate(() => {
      const a = (
        window as unknown as { __dictionaryAudio: HTMLAudioElement[] }
      ).__dictionaryAudio.at(-1)!;
      return {
        rate: a.playbackRate,
        pitch: a.preservesPitch,
        reused: a.src.includes('/workbook/en-GB/'),
      };
    }),
  ).toEqual({ rate: 0.75, pitch: true, reused: true });
  expect(errors).toEqual([]);
});
