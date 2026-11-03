import { create } from 'zustand';
import type { LearningProgress } from '../types';
import { initialProgress } from '../services/learning';
import { progressRepository, validateImport } from '../services/storage';
interface State {
  progress: LearningProgress;
  ready: boolean;
  error: string;
  init: () => Promise<void>;
  update: (fn: (p: LearningProgress) => LearningProgress) => Promise<void>;
  reset: () => Promise<void>;
  importData: (v: unknown) => Promise<void>;
}
let writes: Promise<void> = Promise.resolve();
export const useProgress = create<State>((set, get) => ({
  progress: initialProgress(),
  ready: false,
  error: '',
  init: async () => {
    try {
      set({ progress: await progressRepository.load(), ready: true });
    } catch {
      set({
        ready: true,
        error: 'Не удалось открыть сохранение. Проверь, разрешено ли браузеру хранить данные.',
      });
    }
  },
  update: async (fn) => {
    const progress = { ...fn(get().progress), updatedAt: Date.now() };
    set({ progress });
    writes = writes.catch(() => {}).then(() => progressRepository.save(progress));
    try {
      await writes;
      set({ error: '' });
    } catch {
      set({ error: 'Прогресс пока не сохранён. Не закрывай вкладку: проверь доступ к хранилищу.' });
    }
  },
  reset: async () => {
    await writes.catch(() => {});
    const progress = await progressRepository.reset();
    set({ progress, error: '' });
  },
  importData: async (v) => {
    const progress = validateImport(v);
    await writes.catch(() => {});
    await progressRepository.save(progress);
    set({ progress, error: '' });
  },
}));
