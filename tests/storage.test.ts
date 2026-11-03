import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import { IndexedDBProgressRepository } from '../src/services/storage';
import { initialProgress, recordAttempt, completeExercise } from '../src/services/learning';
import { lesson } from '../src/lessons';
it('сохраняет и восстанавливает прогресс через новый адаптер IndexedDB', async () => {
  const repo = new IndexedDBProgressRepository();
  await repo.reset();
  let p = recordAttempt(initialProgress(), lesson.exercises[0], true, false);
  p = completeExercise(p, lesson.exercises[0]);
  await repo.save(p);
  const restored = await new IndexedDBProgressRepository().load();
  expect(restored).toEqual(p);
  expect(restored.currentExerciseId).toBe(lesson.exercises[1].id);
  expect(await repo.reset()).toMatchObject({ completed: [], sessions: 0 });
});
