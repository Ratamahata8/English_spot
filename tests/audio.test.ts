import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { audioTexts, lexicon } from '../src/lessons';
import manifest from '../public/audio/en-GB/manifest.json';
import type { AudioAsset } from '../src/types';
it('все уникальные учебные строки соответствуют реальным MP3 с верным хешем', () => {
  const assets = manifest as Record<string, AudioAsset>;
  expect(Object.keys(assets).sort()).toEqual(audioTexts().sort());
  for (const text of audioTexts()) {
    const a = assets[text];
    expect(a.text).toBe(text);
    expect(a.voice).toBe('en-GB-SoniaNeural');
    const path = `public/audio/en-GB/${a.path}`;
    expect(existsSync(path), text).toBe(true);
    const bytes = readFileSync(path);
    expect(bytes.length).toBeGreaterThan(500);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.sha256);
  }
});
it('все слова программы и лексические единицы подсказок озвучены', () => {
  for (const w of lexicon) expect((manifest as Record<string, AudioAsset>)[w.en]).toBeDefined();
});
it('подтверждённые формы повторно используют файлы Sonia сборника без копий', async () => {
  const { default: verified } = await import('../docs/textbook-2026/verified-forms.json');
  const { default: workbook } = await import('../public/audio/workbook/en-GB/manifest.json');
  const assets = manifest as Record<string, AudioAsset>;
  const other = workbook as Record<string, AudioAsset>;
  const strings = verified.forms.flatMap((w) => [w.en, w.example]);
  const reused = strings.filter((t) => assets[t].path.startsWith('../workbook/en-GB/'));
  expect(reused).toHaveLength(8);
  for (const t of reused) {
    const a = assets[t];
    const basename = a.path.split('/').at(-1)!;
    expect(Object.values(other).some((v) => v.path === basename && v.sha256 === a.sha256)).toBe(
      true,
    );
    expect(existsSync('public/audio/en-GB/' + basename)).toBe(false);
  }
  expect(verified.audioPreparation.newlySynthesized).toBe(10);
});
