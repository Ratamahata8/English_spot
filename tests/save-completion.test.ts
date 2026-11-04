import 'fake-indexeddb/auto';
import { it, expect, vi } from 'vitest';
import { useProgress } from '../src/stores/progress';
import { progressRepository } from '../src/services/storage';
import { lesson } from '../src/lessons';
import { completeExercise, initialProgress } from '../src/services/learning';
it('завершение остаётся в состоянии сохранения до подтверждения IndexedDB', async () => {
  const store = useProgress;
  await store.getState().reset();
  let progress = initialProgress();
  for (const e of lesson.exercises.slice(0, -1)) progress = completeExercise(progress, e);
  store.setState({ progress, records: { [progress.lessonId]: progress } });
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const original = progressRepository.save.bind(progressRepository);
  const save = vi.spyOn(progressRepository, 'save').mockImplementation(async (p) => {
    await blocked;
    await original(p);
  });
  try {
    const completion = store
      .getState()
      .update((p) => completeExercise(p, lesson.exercises.at(-1)!));
    expect(store.getState().progress.lessonComplete).toBe(true);
    expect(store.getState().saving).toBe(1);
    // A final timer write must also finish before the UI advertises completion.
    const timer = store.getState().update((p) => ({ ...p, seconds: p.seconds + 1 }));
    expect(store.getState().saving).toBe(2);
    release();
    await Promise.all([completion, timer]);
    expect(store.getState().saving).toBe(0);
    const restored = await progressRepository.load(progress.lessonId);
    expect(restored.lessonComplete).toBe(true);
    expect(restored.seconds).toBe(1);
  } finally {
    release();
    save.mockRestore();
  }
});
