import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { it, expect } from 'vitest';
import { lessons, lesson, getLesson } from '../src/lessons';
import {
  initialProgress,
  completeExercise,
  recordAttempt,
  restartLesson,
  percent,
  remedialFor,
  summarize,
} from '../src/services/learning';
import {
  IndexedDBProgressRepository,
  validateBundle,
  validateImport,
} from '../src/services/storage';
import { useProgress } from '../src/stores/progress';

it('каждый из 17 уроков можно закончить и пройти второй раз без потери статистики', () => {
  expect(lessons).toHaveLength(17);
  for (const l of lessons) {
    let p = initialProgress(l.id);
    const answer = l.exercises.find((e) => e.type === 'word')!;
    p = recordAttempt(p, answer, false, true, 1);
    for (const e of l.exercises) p = completeExercise(p, e);
    expect(p.completedRuns).toBe(1);
    expect(percent(p)).toBe(100);
    const old = p;
    p = restartLesson(p);
    expect(p.completed).toEqual([]);
    expect(p.currentExerciseId).toBe(l.exercises[0].id);
    expect(p.stats).toEqual(old.stats);
    expect(p.reviewIds).toEqual(old.reviewIds);
    expect(p.completedRuns).toBe(1);
    for (const e of l.exercises) p = completeExercise(p, e);
    expect(p.completedRuns).toBe(2);
    expect(p.stats[answer.wordId].errors).toBe(1);
    expect(completeExercise(p, l.exercises.at(-1)!).completedRuns).toBe(2);
    expect(validateImport(p).lessonId).toBe(l.id);
  }
});
it('у нового урока своя адаптивная грамматика, а не правило первого урока', () => {
  const l = getLesson('food-likes');
  const e = l.exercises.find((e) => e.type === 'sentence')!;
  let p = initialProgress(l.id);
  p = recordAttempt(recordAttempt(p, e, false, false), e, false, false);
  expect(remedialFor(p, e, 'jelly likes he')).toBe('food-like');
  expect(remedialFor({ ...p, remedialCount: 2 }, e, 'jelly likes he')).toBeNull();
});
it('экспорт v2 сохраняет несколько уроков и отвергает дубликаты/чужие задания', () => {
  const a = initialProgress();
  const b = completeExercise(initialProgress('subjects'), getLesson('subjects').exercises[0]);
  const bundle = { schemaVersion: 2, selectedLessonId: b.lessonId, lessons: [a, b] };
  expect(validateBundle(JSON.parse(JSON.stringify(bundle)))).toEqual(bundle);
  expect(() => validateBundle({ ...bundle, lessons: [a, a] })).toThrow();
  expect(() => validateImport({ ...b, completed: [lesson.exercises[0].id] })).toThrow();
  expect(() => validateBundle({ ...bundle, selectedLessonId: 'unknown' })).toThrow();
});
it('миграция Dexie v1 -> v2 сохраняет реальное старое сохранение', async () => {
  const name = 'english-spot-v1-migration';
  const old = new Dexie(name);
  old.version(1).stores({ progress: 'lessonId' });
  const p = initialProgress();
  const legacy: Partial<typeof p> = {
    ...p,
    successful: 12,
    seconds: 83,
    lessonComplete: true,
    completed: lesson.exercises.map((e) => e.id),
    currentExerciseId: null,
  };
  delete legacy.completedRuns;
  delete legacy.lastCompletedAt;
  await old.table('progress').put(legacy);
  old.close();
  const repo = new IndexedDBProgressRepository(name);
  const migrated = await repo.load();
  expect(migrated).toMatchObject({
    successful: 12,
    seconds: 83,
    completedRuns: 1,
    lessonComplete: true,
  });
  expect(await repo.loadAll()).toHaveLength(1);
  expect(await repo.selected()).toBe(lesson.id);
  const b = initialProgress('subjects');
  await repo.save(b);
  await repo.select(b.lessonId);
  expect(await repo.selected()).toBe(b.lessonId);
  expect((await repo.load()).successful).toBe(12);
});
it('переключение урока и позднее сохранение таймера не смешивают прогресс', async () => {
  const store = useProgress;
  await store.getState().reset();
  await store.getState().selectLesson(lesson.id);
  await store.getState().update((p) => completeExercise(p, lesson.exercises[0]));
  await store.getState().selectLesson('subjects');
  await store.getState().update((p) => ({ ...p, seconds: p.seconds + 20 }), lesson.id);
  expect(store.getState().progress.lessonId).toBe('subjects');
  expect(store.getState().progress.completed).toEqual([]);
  await store.getState().selectLesson(lesson.id);
  expect(store.getState().progress.completed).toEqual([lesson.exercises[0].id]);
  expect(store.getState().progress.seconds).toBe(20);
  const bundle = store.getState().exportData();
  expect(bundle.lessons).toHaveLength(2);
  await store.getState().reset();
  await store.getState().importData(bundle);
  expect(Object.keys(store.getState().records)).toHaveLength(2);
  await store.getState().importData({ ...initialProgress(), successful: 9 });
  expect(Object.keys(store.getState().records)).toHaveLength(2);
  expect(store.getState().progress.successful).toBe(9);
});
it('статистика пройденных тем не исчезает при повторном запуске', () => {
  let p = initialProgress();
  for (const e of lesson.exercises) p = completeExercise(p, e);
  const replay = restartLesson(p);
  const s = summarize({ [p.lessonId]: replay });
  expect(s.completed).toBe(1);
  expect(s.runs).toBe(1);
});
