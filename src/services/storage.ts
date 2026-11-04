import Dexie, { type Table } from 'dexie';
import type { LearningProgress, ProgressBundle } from '../types';
import { initialProgress } from './learning';
import { lesson, lessons, getLesson, lexicon } from '../lessons';
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
  progress!: Table<LearningProgress, string>;
  preferences!: Table<{ key: string; value: string }, string>;
  constructor(name = 'english-spot') {
    super(name);
    this.version(1).stores({ progress: 'lessonId' });
    this.version(2).stores({ progress: 'lessonId', preferences: 'key' });
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
    await this.db.transaction('rw', this.db.progress, this.db.preferences, async () => {
      await this.db.progress.clear();
      await this.db.preferences.clear();
    });
  }
  async replaceAll(bundle: ProgressBundle) {
    await this.db.transaction('rw', this.db.progress, this.db.preferences, async () => {
      await this.db.progress.clear();
      await this.db.progress.bulkPut(bundle.lessons);
      await this.db.preferences.put({ key: 'selectedLesson', value: bundle.selectedLessonId });
    });
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
  return { schemaVersion: 2, selectedLessonId: data.selectedLessonId, lessons: records };
}
export const progressRepository: ProgressRepository = new IndexedDBProgressRepository();
