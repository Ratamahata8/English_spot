import { rememberSettings, recoverSettings, forgetSettings } from '../services/settings';
import { create } from 'zustand';
import type { LearningProgress, ProgressBundle } from '../types';
import { initialProgress, restartLesson } from '../services/learning';
import { progressRepository, validateBundle } from '../services/storage';
import { DEFAULT_LESSON_ID, getLesson } from '../lessons';
interface State {
  progress: LearningProgress;
  records: Record<string, LearningProgress>;
  ready: boolean;
  saving: number;
  error: string;
  init: () => Promise<void>;
  update: (fn: (p: LearningProgress) => LearningProgress, lessonId?: string) => Promise<void>;
  selectLesson: (id: string, restart?: boolean) => Promise<void>;
  reset: () => Promise<void>;
  importData: (v: unknown) => Promise<void>;
  exportData: () => ProgressBundle;
}
let writes: Promise<void> = Promise.resolve();
export const useProgress = create<State>((set, get) => ({
  progress: initialProgress(),
  records: {},
  ready: false,
  saving: 0,
  error: '',
  init: async () => {
    try {
      const records = Object.fromEntries(
        (await progressRepository.loadAll()).map((p) => [p.lessonId, p]),
      );
      const id = await progressRepository.selected();
      const loaded = records[id] || initialProgress(id);
      const progress = recoverSettings(loaded, !!records[id]);
      let error = '';
      if (progress !== loaded) {
        records[id] = progress;
        try {
          await progressRepository.save(progress);
        } catch {
          error = 'Настройки восстановлены, но запись IndexedDB пока недоступна.';
        }
      }
      set({ records, progress, ready: true, error });
    } catch {
      set({
        ready: true,
        error: 'Не удалось открыть сохранение. Проверь, разрешено ли браузеру хранить данные.',
      });
    }
  },
  update: async (fn, lessonId) => {
    const id = lessonId || get().progress.lessonId;
    const base =
      get().progress.lessonId === id ? get().progress : get().records[id] || initialProgress(id);
    const progress = { ...fn(base), updatedAt: Date.now() };
    if (
      progress.settings.slow !== base.settings.slow ||
      progress.settings.reduceMotion !== base.settings.reduceMotion
    )
      rememberSettings(progress);
    set((s) => ({
      saving: s.saving + 1,
      ...(s.progress.lessonId === id ? { progress } : {}),
      records: { ...s.records, [id]: progress },
    }));
    writes = writes.catch(() => {}).then(() => progressRepository.save(progress));
    try {
      await writes;
      set({ error: '' });
    } catch {
      set({ error: 'Прогресс пока не сохранён. Не закрывай вкладку: проверь доступ к хранилищу.' });
    } finally {
      set((s) => ({ saving: Math.max(0, s.saving - 1) }));
    }
  },
  selectLesson: async (id, restart = false) => {
    getLesson(id);
    await writes.catch(() => {});
    let progress = get().records[id] || initialProgress(id);
    if (restart) progress = restartLesson(progress);
    progress = { ...progress, settings: get().progress.settings };
    await progressRepository.save(progress);
    await progressRepository.select(id);
    rememberSettings(progress);
    set((s) => ({ progress, records: { ...s.records, [id]: progress } }));
  },
  reset: async () => {
    await writes.catch(() => {});
    await progressRepository.resetAll();
    forgetSettings();
    set({ progress: initialProgress(), records: {}, error: '' });
  },
  importData: async (v) => {
    const bundle = validateBundle(v);
    await writes.catch(() => {});
    if (v && typeof v === 'object' && (v as { schemaVersion: unknown }).schemaVersion === 1) {
      const p = bundle.lessons[0];
      await progressRepository.save(p);
      await progressRepository.select(p.lessonId);
      set((s) => ({ records: { ...s.records, [p.lessonId]: p }, progress: p, error: '' }));
    } else {
      await progressRepository.replaceAll(bundle);
      const records = Object.fromEntries(bundle.lessons.map((p) => [p.lessonId, p]));
      set({
        records,
        progress: records[bundle.selectedLessonId] || initialProgress(bundle.selectedLessonId),
        error: '',
      });
    }
    rememberSettings(get().progress);
  },
  exportData: () => ({
    schemaVersion: 2,
    selectedLessonId: get().progress.lessonId || DEFAULT_LESSON_ID,
    lessons: Object.values(get().records),
  }),
}));
