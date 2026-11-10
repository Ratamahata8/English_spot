import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import Dexie from 'dexie';
import { validateEditions } from '../scripts/validate_editions';
import {
  EDITION_2017,
  EDITION_2026,
  LEGACY_SOURCE_ID,
  edition2026Sections,
  sectionForPage2026,
} from '../src/workbook/editions';
import { initialWorkbook, validateWorkbook } from '../src/workbook/learning';
import {
  IndexedDBProgressRepository,
  createWorkbookRepository,
  createReaderRepository,
  validateBundle,
} from '../src/services/storage';
import { initialProgress } from '../src/services/learning';
import { emptyReader, scenes } from '../src/textbook';
import {
  workbookExercises,
  edition2026Exercises,
  edition2026Words,
  getWordForm,
  workbookWords,
} from '../src/workbook';
it('2026: подтверждённые границы, честные соответствия, новые темы и MP3', () => {
  expect(validateEditions()).toMatchObject({
    oldSourceExercises: 313,
    existingInteractiveAudited: 543,
    verifiedExerciseCorrespondences: 0,
    newAuthoredTrainings: 4,
    newTrainingSteps: 24,
    newConfirmedForms: 6,
  });
  expect(edition2026Sections.map((s) => s.start)).toEqual([4, 18, 28, 42, 57, 73, 90, 108, 126]);
  expect(sectionForPage2026(17)?.module).toBe('intro');
  expect(sectionForPage2026(18)?.module).toBe('1');
  expect(sectionForPage2026(83)?.module).toBe('5');
  expect(sectionForPage2026(103)?.module).toBe('6');
  expect(sectionForPage2026(141)?.module).toBe('8');
  expect(edition2026Sections.at(-1)?.end).toBeNull();
});
it('слова 2017 не становятся подтверждёнными словами 2026; формы и ID различаются', () => {
  expect(edition2026Words.map((w) => w.form)).toEqual([
    'did',
    "didn't",
    'was',
    'were',
    'there was',
    'there were',
  ]);
  expect(new Set([...workbookWords, ...edition2026Words].map((w) => w.id)).size).toBe(179);
  expect(getWordForm(workbookWords[0].id)?.occurrences[0].sourceId).toBe(EDITION_2017);
  expect(
    edition2026Words.every((w) =>
      w.occurrences.every((o) => o.sourceId === EDITION_2026 && o.exerciseNumber === null),
    ),
  ).toBe(true);
});
it('миграция v4→v5 сохраняет старые результаты, ID, настройки и комиксы, не присваивая их 2026', async () => {
  const name = 'edition-migration-' + Math.random();
  const db = new Dexie(name);
  db.version(4).stores({
    progress: 'lessonId',
    preferences: 'key',
    reader: 'sceneId',
    workbook: 'sourceId',
  });
  const old = initialWorkbook();
  old.sourceId = LEGACY_SOURCE_ID;
  old.hintCount = 7;
  old.seconds = 121;
  old.positions[old.currentId] = workbookExercises[0].tasks.length;
  old.completed = [old.currentId];
  const lesson = initialProgress();
  lesson.seconds = 77;
  const reader = emptyReader(scenes[0]);
  reader.understood = [scenes[0].lines[0].id];
  await db.table('workbook').put(old);
  await db.table('progress').put(lesson);
  await db.table('reader').put(reader);
  await db.table('preferences').put({ key: 'selectedLesson', value: lesson.lessonId });
  db.close();
  const repo = createWorkbookRepository(name);
  const records = await repo.loadAll();
  expect(records).toEqual([{ ...old, sourceId: EDITION_2017 }]);
  const modern = initialWorkbook(EDITION_2026);
  expect(modern.completed).toEqual([]);
  expect(modern.words).toEqual({});
  await repo.save(modern);
  expect(await repo.loadAll()).toHaveLength(2);
  const legacy = new IndexedDBProgressRepository(name);
  expect((await legacy.load()).seconds).toBe(77);
  expect(await legacy.selected()).toBe(lesson.lessonId);
  expect((await createReaderRepository(name).loadAll())[0].understood).toEqual(reader.understood);
  const inspect = new Dexie(name);
  await inspect.open();
  expect(inspect.verno).toBe(5);
  expect(await inspect.table('workbook').get(LEGACY_SOURCE_ID)).toBeUndefined();
  inspect.close();
});
it('старые резервные копии нормализуют alias; две редакции экспортируются отдельно, смешивание отклоняется', () => {
  const old = { ...initialWorkbook(), sourceId: LEGACY_SOURCE_ID };
  const modern = initialWorkbook(EDITION_2026);
  expect(validateWorkbook([old, modern]).map((p) => p.sourceId)).toEqual([
    EDITION_2017,
    EDITION_2026,
  ]);
  expect(() => validateWorkbook([old, { ...old, sourceId: EDITION_2017 }])).toThrow();
  expect(() => validateWorkbook([{ ...modern, currentId: old.currentId }])).toThrow();
  expect(() =>
    validateWorkbook([{ ...old, positions: { [edition2026Exercises[0].id]: 1 } }]),
  ).toThrow();
  const p = initialProgress();
  expect(
    validateBundle({
      schemaVersion: 2,
      selectedLessonId: p.lessonId,
      lessons: [p],
      workbook: [old, modern],
    }).workbook,
  ).toHaveLength(2);
});
it('импорт старой копии без workbook сохраняет обе редакции', async () => {
  const name = 'editions-import-' + Math.random();
  const repo = createWorkbookRepository(name);
  const old = initialWorkbook();
  old.seconds = 60;
  const modern = initialWorkbook(EDITION_2026);
  modern.hintCount = 2;
  await repo.save(old);
  await repo.save(modern);
  const lesson = initialProgress();
  const progress = new IndexedDBProgressRepository(name);
  await progress.replaceAll(
    validateBundle({ schemaVersion: 2, selectedLessonId: lesson.lessonId, lessons: [lesson] }),
  );
  expect(await repo.loadAll()).toEqual(expect.arrayContaining([old, modern]));
  await expect(
    progress.replaceAll({
      schemaVersion: 2,
      selectedLessonId: lesson.lessonId,
      lessons: [lesson],
      workbook: [old, { ...modern, currentId: old.currentId }],
    }),
  ).rejects.toThrow();
  expect(await repo.loadAll()).toHaveLength(2);
});
