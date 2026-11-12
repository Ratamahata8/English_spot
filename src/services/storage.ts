import { EDITION_2017, LEGACY_SOURCE_ID } from '../workbook/editions';
import { validateWorkbook } from '../workbook/learning';
import type { WorkbookProgress } from '../workbook/types';
import Dexie, { type Table } from 'dexie';
import type { LearningProgress, ProgressBundle } from '../types';
import { type ReaderProgress, validateReader } from '../textbook';
import { initialProgress } from './learning';
import { lesson, lessons, getLesson, lexicon } from '../lessons';
import {
  validatePractice,
  emptyPractice,
  findPractice,
  type PracticeProgress,
} from '../textbook2026';
export interface ProgressRepository {
  load(id?: string): Promise<LearningProgress>;
  loadAll(): Promise<LearningProgress[]>;
  selected(): Promise<string>;
  select(id: string): Promise<void>;
  replaceAll(bundle: ProgressBundle): Promise<void>;
  resetAll(): Promise<void>;
  save(p: LearningProgress): Promise<void>;
  reset(id?: string): Promise<LearningProgress>;
}
class ProgressDB extends Dexie {
  textbookPractice!: Table<PracticeProgress, string>;
  workbook!: Table<WorkbookProgress, string>;
  progress!: Table<LearningProgress, string>;
  reader!: Table<ReaderProgress, string>;
  preferences!: Table<{ key: string; value: string }, string>;
  constructor(name = 'english-spot') {
    super(name);
    this.version(1).stores({ progress: 'lessonId' });
    this.version(2).stores({ progress: 'lessonId', preferences: 'key' });
    this.version(3).stores({ progress: 'lessonId', preferences: 'key', reader: 'sceneId' });
    this.version(4).stores({
      progress: 'lessonId',
      preferences: 'key',
      reader: 'sceneId',
      workbook: 'sourceId',
    });
    this.version(5)
      .stores({ progress: 'lessonId', preferences: 'key', reader: 'sceneId', workbook: 'sourceId' })
      .upgrade(async (tx) => {
        const table = tx.table('workbook');
        const old = await table.get(LEGACY_SOURCE_ID);
        if (old) {
          if (await table.get(EDITION_2017))
            throw Error(
              'Два конфликтующих сохранения 2017: миграция остановлена без удаления данных.',
            );
          await table.put({ ...old, sourceId: EDITION_2017 });
          await table.delete(LEGACY_SOURCE_ID);
        }
      });
    this.version(6).stores({
      progress: 'lessonId',
      preferences: 'key',
      reader: 'sceneId',
      workbook: 'sourceId',
      textbookPractice: 'unitId,sourceId',
    });
  }
}
export function validateImport(value: unknown): LearningProgress {
  if (!value || typeof value !== 'object') throw Error('Файл не содержит прогресс.');
  const p = value as LearningProgress;
  if (p.schemaVersion !== 1 || !lessons.some((l) => l.id === p.lessonId))
    throw Error('Неподдерживаемая версия или неверные задания.');
  const target = getLesson(p.lessonId);
  const exerciseIds = new Set(target.exercises.map((e) => e.id));
  const skillIds = new Set([
    ...lexicon.map((w) => w.id),
    ...lessons.flatMap((l) => [...l.grammar.map((g) => g.id), ...l.remedial.map((r) => r.id)]),
  ]);
  const wordIds = new Set(lexicon.map((w) => w.id));
  if (
    p.schemaVersion !== 1 ||
    !Array.isArray(p.completed) ||
    p.completed.some((id) => !exerciseIds.has(id)) ||
    new Set(p.completed).size !== p.completed.length
  )
    throw Error('Неподдерживаемая версия или неверные задания.');
  if (p.currentExerciseId !== null && !exerciseIds.has(p.currentExerciseId))
    throw Error('Неизвестное текущее задание.');
  if (!p.stats || typeof p.stats !== 'object' || Array.isArray(p.stats))
    throw Error('Нет статистики.');
  for (const [id, s] of Object.entries(p.stats)) {
    if (
      !skillIds.has(id) ||
      !s ||
      ['attempts', 'correct', 'errors', 'hints', 'lastReviewed', 'level', 'due', 'streak'].some(
        (k) => !Number.isFinite(s[k as keyof typeof s]) || s[k as keyof typeof s] < 0,
      ) ||
      s.level > 4 ||
      s.attempts !== s.correct + s.errors
    )
      throw Error('Повреждена статистика навыков.');
  }
  if (
    !Array.isArray(p.reviewIds) ||
    p.reviewIds.some((id) => !wordIds.has(id)) ||
    !Array.isArray(p.remedialDone) ||
    p.remedialDone.some((id) => !target.remedial.some((r) => r.id === id && r.available))
  )
    throw Error('Некорректная очередь повторения.');
  if (
    ['sessions', 'seconds', 'hintCount', 'successful', 'remedialCount', 'updatedAt'].some(
      (k) =>
        !Number.isFinite(p[k as keyof LearningProgress]) ||
        Number(p[k as keyof LearningProgress]) < 0,
    )
  )
    throw Error('Повреждены счётчики.');
  if (
    typeof p.lessonComplete !== 'boolean' ||
    p.lessonComplete !== (p.completed.length === exerciseIds.size) ||
    !p.settings ||
    typeof p.settings.slow !== 'boolean' ||
    typeof p.settings.reduceMotion !== 'boolean'
  )
    throw Error('Некорректные настройки или завершение урока.');
  if (
    (p.lessonComplete && p.currentExerciseId !== null) ||
    (!p.lessonComplete &&
      (p.currentExerciseId === null || p.completed.includes(p.currentExerciseId)))
  )
    throw Error('Неверная точка продолжения.');
  if (
    p.completedRuns !== undefined &&
    (!Number.isInteger(p.completedRuns) || p.completedRuns < Number(p.lessonComplete))
  )
    throw Error('Неверный счётчик прохождений.');
  if (
    p.lastCompletedAt !== undefined &&
    (!Number.isFinite(p.lastCompletedAt) || p.lastCompletedAt < 0)
  )
    throw Error('Неверная дата прохождения.');
  return {
    ...structuredClone(p),
    completedRuns: p.completedRuns ?? Number(p.lessonComplete),
    lastCompletedAt: p.lastCompletedAt || 0,
  };
}
export class IndexedDBProgressRepository implements ProgressRepository {
  private db: ProgressDB;
  constructor(name = 'english-spot') {
    this.db = new ProgressDB(name);
  }
  async load(id = lesson.id) {
    const p = await this.db.progress.get(id);
    return p ? validateImport(p) : initialProgress(id);
  }
  async loadAll() {
    return (await this.db.progress.toArray()).map(validateImport);
  }
  async selected() {
    const value = (await this.db.preferences.get('selectedLesson'))?.value;
    return value && lessons.some((l) => l.id === value) ? value : lesson.id;
  }
  async select(id: string) {
    getLesson(id);
    await this.db.preferences.put({ key: 'selectedLesson', value: id });
  }
  async save(p: LearningProgress) {
    await this.db.progress.put(p);
  }
  async reset(id = lesson.id) {
    const p = initialProgress(id);
    await this.save(p);
    return p;
  }
  async resetAll() {
    await this.db.transaction(
      'rw',
      this.db.progress,
      this.db.preferences,
      this.db.reader,
      this.db.workbook,
      this.db.textbookPractice,
      async () => {
        await this.db.progress.clear();
        await this.db.preferences.clear();
        await this.db.reader.clear();
        await this.db.workbook.clear();
        await this.db.textbookPractice.clear();
      },
    );
  }
  async replaceAll(bundle: ProgressBundle) {
    await this.db.transaction(
      'rw',
      this.db.progress,
      this.db.preferences,
      this.db.reader,
      this.db.workbook,
      this.db.textbookPractice,
      async () => {
        await this.db.progress.clear();
        await this.db.progress.bulkPut(bundle.lessons);
        if (bundle.workbook !== undefined) {
          await this.db.workbook.clear();
          await this.db.workbook.bulkPut(validateWorkbook(bundle.workbook));
        }
        if (bundle.reader !== undefined) {
          await this.db.reader.clear();
          await this.db.reader.bulkPut(validateReader(bundle.reader));
        }
        if (bundle.textbookPractice !== undefined) {
          await this.db.textbookPractice.clear();
          await this.db.textbookPractice.bulkPut(validatePractice(bundle.textbookPractice));
        }
        await this.db.preferences.put({ key: 'selectedLesson', value: bundle.selectedLessonId });
      },
    );
  }
}
export function validateBundle(value: unknown): ProgressBundle {
  if (
    value &&
    typeof value === 'object' &&
    (value as { schemaVersion: unknown }).schemaVersion === 1
  ) {
    const p = validateImport(value);
    return { schemaVersion: 2, selectedLessonId: p.lessonId, lessons: [p] };
  }
  const data = value as ProgressBundle;
  if (
    !data ||
    data.schemaVersion !== 2 ||
    !Array.isArray(data.lessons) ||
    data.lessons.length > lessons.length ||
    !lessons.some((l) => l.id === data.selectedLessonId)
  )
    throw Error('Неподдерживаемая версия или неверные задания.');
  const records = data.lessons.map(validateImport);
  if (new Set(records.map((p) => p.lessonId)).size !== records.length)
    throw Error('В файле повторяется один урок.');
  return {
    schemaVersion: 2,
    selectedLessonId: data.selectedLessonId,
    lessons: records,
    ...(data.workbook === undefined ? {} : { workbook: validateWorkbook(data.workbook) }),
    ...(data.reader === undefined ? {} : { reader: validateReader(data.reader) }),
    ...(data.textbookPractice === undefined
      ? {}
      : { textbookPractice: validatePractice(data.textbookPractice) }),
  };
}
export const progressRepository: ProgressRepository = new IndexedDBProgressRepository();

export function createReaderRepository(name = 'english-spot') {
  const readerDB = new ProgressDB(name);
  return {
    loadAll: async () => validateReader(await readerDB.reader.toArray()),
    save: async (record: ReaderProgress) => {
      validateReader([record]);
      await readerDB.reader.put(record);
    },
  };
}
export const readerRepository = createReaderRepository();

export function createWorkbookRepository(name = 'english-spot') {
  const db = new ProgressDB(name);
  return {
    loadAll: async () => validateWorkbook(await db.workbook.toArray()),
    save: async (p: WorkbookProgress) => {
      validateWorkbook([p]);
      await db.workbook.put(p);
    },
  };
}
export const workbookRepository = createWorkbookRepository();
export function createTextbookPracticeRepository(name = 'english-spot') {
  const db = new ProgressDB(name);
  return {
    loadAll: async () => validatePractice(await db.textbookPractice.toArray()),
    load: async (id: string) => {
      const u = findPractice(id);
      if (!u) throw Error('Неизвестное занятие учебника.');
      const p = await db.textbookPractice.get(id);
      return p ? validatePractice([p])[0] : emptyPractice(u);
    },
    update: async (id: string, change: (p: PracticeProgress) => PracticeProgress) =>
      db.transaction('rw', db.textbookPractice, async () => {
        const u = findPractice(id);
        if (!u) throw Error('Неизвестное занятие учебника.');
        const old = await db.textbookPractice.get(id);
        const next = change(old ? validatePractice([old])[0] : emptyPractice(u));
        validatePractice([next]);
        await db.textbookPractice.put(next);
        return next;
      }),
  };
}
export const textbookPracticeRepository = createTextbookPracticeRepository();
