import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scenes, emptyReader, validateReader } from '../src/textbook';
import { getLesson } from '../src/lessons';
import {
  createReaderRepository,
  IndexedDBProgressRepository,
  validateBundle,
} from '../src/services/storage';
import { initialProgress } from '../src/services/learning';
import type { AudioAsset } from '../src/types';
it('страницы, области реплик и связи соответствуют четырём модулям', () => {
  expect(scenes).toHaveLength(11);
  expect(scenes.flatMap((s) => s.lines)).toHaveLength(55);
  expect(scenes.filter((s) => s.kind === 'comic').map((s) => s.module)).toEqual([1, 2, 3, 4]);
  expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
  const ids = scenes.flatMap((s) => s.lines.map((l) => l.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const scene of scenes) {
    expect(existsSync('public/' + scene.image)).toBe(true);
    for (const id of scene.lessonIds) expect(getLesson(id)).toBeDefined();
    for (const line of scene.lines) {
      expect(line.why.length).toBeGreaterThan(40);
      expect(line.ru).toMatch(/[а-яё]/i);
      expect(line.chunks.length).toBeGreaterThan(0);
      const [x, y, w, h] = line.box;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(x + w).toBeLessThanOrEqual(100);
      expect(y + h).toBeLessThanOrEqual(100);
    }
  }
});
it('английские реплики, смысловые кусочки и русские переводы имеют MP3 с проверяемым SHA', () => {
  const corpus = {
    'en-GB': scenes.flatMap((s) => s.lines.flatMap((l) => [l.en, ...l.chunks.map((c) => c.en)])),
    'ru-RU': scenes.flatMap((s) => s.lines.map((l) => l.ru)),
  };
  for (const [language, texts] of Object.entries(corpus)) {
    const folder = `public/audio/textbook/${language}/`;
    const manifest = JSON.parse(readFileSync(folder + 'manifest.json', 'utf8')) as Record<
      string,
      AudioAsset
    >;
    expect(Object.keys(manifest).sort()).toEqual([...new Set(texts)].sort());
    for (const [text, asset] of Object.entries(manifest)) {
      expect(asset.text).toBe(text);
      expect(asset.voice).toBe(language === 'en-GB' ? 'en-GB-SoniaNeural' : 'ru-RU-SvetlanaNeural');
      const data = readFileSync(folder + asset.path);
      expect(data.length).toBeGreaterThan(500);
      expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256);
    }
  }
});
it('миграция IndexedDB v2 сохраняет урок и добавляет независимые отметки реплик в v3', async () => {
  const name = 'reader-migration';
  const old = new Dexie(name);
  old.version(2).stores({ progress: 'lessonId', preferences: 'key' });
  const progress = initialProgress();
  await old.table('progress').put(progress);
  old.close();
  const repo = new IndexedDBProgressRepository(name);
  expect(await repo.load()).toEqual(progress);
  const reader = createReaderRepository(name);
  const p = { ...emptyReader(scenes[0]), bookmarks: [scenes[0].lines[0].id] };
  await reader.save(p);
  expect(await createReaderRepository(name).loadAll()).toEqual([p]);
  const bundle = validateBundle({
    schemaVersion: 2,
    selectedLessonId: progress.lessonId,
    lessons: [progress],
    reader: [p],
  });
  expect(bundle.reader).toEqual([p]);
  await repo.replaceAll({
    schemaVersion: 2,
    selectedLessonId: progress.lessonId,
    lessons: [progress],
  });
  expect(await reader.loadAll()).toEqual([p]); // Old course-only backups preserve reader data.
  await repo.replaceAll({ ...bundle, reader: [] });
  expect(await reader.loadAll()).toEqual([]);
  await reader.save(p);
  await repo.resetAll();
  expect(await reader.loadAll()).toEqual([]);
});
it('импорт отвергает неизвестные реплики, дубликаты и повреждённые отметки', () => {
  const p = emptyReader(scenes[0]);
  expect(() => validateReader([{ ...p, heard: ['unknown'] }])).toThrow();
  expect(() => validateReader([p, p])).toThrow();
  expect(() => validateReader([{ ...p, bookmarks: [p.lastLineId, p.lastLineId] }])).toThrow();
  expect(() => validateReader([{ ...p, updatedAt: -1 }])).toThrow();
  expect(() =>
    validateBundle({
      schemaVersion: 2,
      selectedLessonId: initialProgress().lessonId,
      lessons: [],
      reader: [{ ...p, sceneId: 'unknown' }],
    }),
  ).toThrow();
});
