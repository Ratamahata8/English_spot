import Dexie, { type Table } from 'dexie';
import type { LearningProgress } from '../types';
import { initialProgress } from './learning';
import { lesson, lexicon } from '../lessons';
export interface ProgressRepository {
  load(): Promise<LearningProgress>;
  save(p: LearningProgress): Promise<void>;
  reset(): Promise<LearningProgress>;
}
class ProgressDB extends Dexie {
  progress!: Table<LearningProgress, string>;
  constructor() {
    super('english-spot');
    this.version(1).stores({ progress: 'lessonId' });
  }
}
export function validateImport(value: unknown): LearningProgress {
  if (!value || typeof value !== 'object') throw Error('Файл не содержит прогресс.');
  const p = value as LearningProgress;
  const exerciseIds = new Set(lesson.exercises.map((e) => e.id));
  const skillIds = new Set([...lexicon.map((w) => w.id), 'this-is', 'my-your']);
  const wordIds = new Set(lexicon.map((w) => w.id));
  if (
    p.schemaVersion !== 1 ||
    p.lessonId !== lesson.id ||
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
    p.remedialDone.some((id) => !['this-is', 'my-your'].includes(id))
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
  return structuredClone(p);
}
export class IndexedDBProgressRepository implements ProgressRepository {
  private db = new ProgressDB();
  async load() {
    const p = await this.db.progress.get(lesson.id);
    return p ? validateImport(p) : initialProgress();
  }
  async save(p: LearningProgress) {
    await this.db.progress.put(p);
  }
  async reset() {
    const p = initialProgress();
    await this.save(p);
    return p;
  }
}
export const progressRepository: ProgressRepository = new IndexedDBProgressRepository();
