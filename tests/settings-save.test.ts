import 'fake-indexeddb/auto';
import { it, expect, vi } from 'vitest';
import { useProgress } from '../src/stores/progress';
import { progressRepository } from '../src/services/storage';
import { initialProgress } from '../src/services/learning';
import { SETTINGS_KEY } from '../src/services/settings';
it('немедленная перезагрузка восстанавливает настройки до окончания IndexedDB; импорт и сброс не оживляют старую копию', async () => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  const p = initialProgress();
  p.seconds = 45;
  await progressRepository.resetAll();
  await progressRepository.save(p);
  await progressRepository.select(p.lessonId);
  useProgress.setState({
    progress: p,
    records: { [p.lessonId]: p },
    ready: true,
    saving: 0,
    error: '',
  });
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const original = progressRepository.save.bind(progressRepository);
  const save = vi.spyOn(progressRepository, 'save').mockImplementationOnce(async (p) => {
    await pending;
    await original(p);
  });
  let write: Promise<void> | undefined;
  try {
    write = useProgress
      .getState()
      .update((p) => ({ ...p, settings: { slow: true, reduceMotion: true } }));
    expect(JSON.parse(values.get(SETTINGS_KEY)!).settings).toEqual({
      slow: true,
      reduceMotion: true,
    });
    expect((await progressRepository.load()).settings.reduceMotion).toBe(false);
    await useProgress.getState().init();
    expect(useProgress.getState().progress.settings).toEqual({ slow: true, reduceMotion: true });
    expect((await progressRepository.load()).settings.reduceMotion).toBe(true);
    expect(useProgress.getState().progress.seconds).toBe(45);
    release();
    await write;
    await useProgress.getState().importData(p);
    await useProgress.getState().init();
    expect(useProgress.getState().progress.settings.reduceMotion).toBe(false);
    await useProgress.getState().reset();
    expect(values.has(SETTINGS_KEY)).toBe(false);
  } finally {
    release();
    await write;
    save.mockRestore();
    vi.unstubAllGlobals();
  }
});
