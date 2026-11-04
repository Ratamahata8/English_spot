import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { TextbookScene } from '../../src/textbook';
const scenes = JSON.parse(readFileSync('src/textbook/scenes.json', 'utf8')) as TextbookScene[];
test('комикс: реальный EN/RU звук, смысловая помощь, фразы, продолжение и резервная копия', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('#/textbook/rascal-3');
  const help = page.getByRole('region', { name: 'Помощь с репликой' });
  await expect(
    help.getByRole('heading', { name: 'Here you are, Rascal.', exact: true }),
  ).toBeVisible();
  const english = page.waitForResponse(
    (r) => r.url().includes('/audio/textbook/en-GB/') && [200, 206].includes(r.status()),
  );
  await help.getByRole('button', { name: '▶ Английский', exact: true }).click();
  await english;
  await expect(help.getByText('Прослушано по-английски: 1.', { exact: false })).toBeVisible({
    timeout: 15000,
  });
  const russian = page.waitForResponse(
    (r) => r.url().includes('/audio/textbook/ru-RU/') && [200, 206].includes(r.status()),
  );
  await help.getByRole('button', { name: '▶ Перевод голосом' }).click();
  await russian;
  await expect(help.getByText('Вот, держи, Раскал.', { exact: true })).toBeVisible();
  await help.getByText('Почему именно так?', { exact: true }).click();
  await expect(help.getByText(/когда что-то дают/)).toBeVisible();
  await help.getByRole('button', { name: /Here you are.*Вот, держи/ }).click();
  await help.getByRole('button', { name: '☆ Сохранить фразу' }).click();
  await help.getByRole('button', { name: 'Отметить: мне понятно' }).click();
  await help.getByRole('button', { name: 'Следующая реплика →' }).click();
  await expect(help).toHaveAttribute('data-line', 'rascal-3-2');
  await page.reload();
  await expect(help).toHaveAttribute('data-line', 'rascal-3-2');
  await page.getByRole('link', { name: '← Все страницы' }).click();
  await expect(page.getByRole('link', { name: /Here you are, Rascal.*стр. 76/ })).toBeVisible();
  await page.getByRole('link', { name: /Here you are, Rascal.*стр. 76/ }).click();
  await expect(help).toHaveAttribute('data-line', 'rascal-3-1');
  await expect(help.getByRole('button', { name: '★ Фраза сохранена' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('#/parents');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '↓ Экспортировать прогресс' }).click();
  const download = await downloaded;
  const path = await download.path();
  const backup = JSON.parse(readFileSync(path!, 'utf8'));
  expect(backup.reader[0].bookmarks).toEqual(['rascal-3-1']);
  expect(backup.reader[0].understood).toEqual(['rascal-3-1']);
  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Сбросить весь прогресс' }).click();
  await expect(page.getByText('Прогресс сброшен.', { exact: true })).toBeVisible();
  await page.getByLabel('Импортировать JSON').setInputFiles({
    name: 'progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByText('Прогресс восстановлен.', { exact: true })).toBeVisible();
  await page.goto('#/textbook/rascal-3');
  await expect(help.getByRole('button', { name: '✓ Мне понятно' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(errors).toEqual([]);
});
test('все 11 страниц и 55 реплик: картинки, перевод, объяснения и переходы к урокам', async ({
  page,
}) => {
  for (const scene of scenes) {
    await page.goto('#/textbook/' + scene.id);
    const help = page.getByRole('region', { name: 'Помощь с репликой' });
    await expect(page.getByRole('heading', { name: scene.title, exact: true })).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('.page-image>img')
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(500);
    await expect(page.locator('.speech-hotspot')).toHaveCount(scene.lines.length);
    for (const [i, line] of scene.lines.entries()) {
      await expect(help).toHaveAttribute('data-line', line.id);
      await expect(help.getByRole('heading', { name: line.en, exact: true })).toBeVisible();
      await help.getByRole('button', { name: 'Показать перевод', exact: false }).click();
      await expect(help.locator('.reader-translation')).toHaveText(line.ru);
      await help.getByText('Почему именно так?', { exact: true }).click();
      await expect(help.locator('.reader-why>p').first()).toHaveText(line.why);
      await expect(help.locator('.phrase-chunks button')).toHaveCount(line.chunks.length);
      if (i < scene.lines.length - 1)
        await help.getByRole('button', { name: 'Следующая реплика →' }).click();
    }
    await expect(help.getByRole('button', { name: 'Следующая реплика →' })).toBeDisabled();
    await expect(page.locator('.spaced a[href^="#/learn/"]')).toHaveCount(scene.lessonIds.length);
  }
});
test('автопрослушивание: следующий кадр, пауза, отмена и отсутствие ложных отметок', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const items: { onended: null | (() => void); paused: boolean }[] = [];
    (window as unknown as { testAudio: typeof items }).testAudio = items;
    (window as unknown as { Audio: unknown }).Audio = class {
      onended = null;
      onerror = null;
      paused = false;
      playbackRate = 1;
      preservesPitch = true;
      constructor(public src: string) {
        items.push(this);
      }
      play() {
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    };
  });
  await page.goto('#/textbook/rascal-3');
  const help = page.getByRole('region', { name: 'Помощь с репликой' });
  await page.getByRole('button', { name: 'Слушать по порядку' }).click();
  await expect(help).toHaveAttribute('data-line', 'rascal-3-1');
  await page.evaluate(() =>
    (
      window as unknown as { testAudio: { onended: null | (() => void) }[] }
    ).testAudio[0].onended?.(),
  );
  await expect(help).toHaveAttribute('data-line', 'rascal-3-2');
  await page.getByRole('button', { name: 'Пауза', exact: true }).click();
  await expect(help.getByText('Прослушано по-английски: 1.', { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { testAudio: { paused: boolean }[] }).testAudio.at(-1)?.paused,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Слушать по порядку' }).click();
  await help.getByRole('button', { name: 'Следующая реплика →' }).click();
  await expect(help).toHaveAttribute('data-line', 'rascal-3-3');
  await expect(page.getByRole('button', { name: 'Слушать по порядку' })).toBeVisible();
  await page.getByRole('link', { name: '← Все страницы' }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { testAudio: { paused: boolean }[] }).testAudio.at(-1)?.paused,
    ),
  ).toBe(true);
});
test('мобильный учебник: поиск страницы, нажатие облачка, увеличение и клавиатура', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/textbook');
  await page.getByLabel('Страница или название').fill('76');
  await expect(page.locator('.book-card')).toHaveCount(1);
  await page.locator('.book-card').click();
  await page
    .getByRole('button', { name: "Реплика 3: Arthur, I've got a new toy!", exact: true })
    .click();
  const help = page.getByRole('region', { name: 'Помощь с репликой' });
  await expect(help).toHaveAttribute('data-line', 'rascal-3-3');
  await page.getByRole('button', { name: 'Картинка крупнее +' }).click();
  await expect(page.locator('.page-image')).toHaveClass(/zoomed/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Картинка крупнее −' }).click();
  await help.getByText('Почему именно так?', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(help.getByText(/A new toy — одна новая игрушка/)).toBeVisible();
  await page.screenshot({ path: '/tmp/english-spot-textbook-mobile.png', fullPage: true });
});
test('все новые MP3 и картинки доступны под базовым путём GitHub Pages', async ({
  request,
  baseURL,
}) => {
  for (const language of ['en-GB', 'ru-RU']) {
    const manifest = JSON.parse(
      readFileSync(`public/audio/textbook/${language}/manifest.json`, 'utf8'),
    ) as Record<string, { path: string }>;
    for (const asset of Object.values(manifest)) {
      const response = await request.get(`${baseURL}audio/textbook/${language}/${asset.path}`);
      expect(response.status()).toBe(200);
      expect((await response.body()).length).toBeGreaterThan(500);
    }
  }
  for (const scene of scenes)
    expect((await request.get(`${baseURL}${scene.image}`)).status()).toBe(200);
});
