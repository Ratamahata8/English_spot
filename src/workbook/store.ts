import { create } from 'zustand';
import { workbookRepository } from '../services/storage';
import { initialWorkbook } from './learning';
import type { WorkbookProgress } from './types';
interface State {
  progress: WorkbookProgress;
  ready: boolean;
  saving: number;
  error: string;
  init: () => Promise<void>;
  flush: () => Promise<void>;
  update: (fn: (p: WorkbookProgress) => WorkbookProgress) => Promise<void>;
}
let writes = Promise.resolve();
export const useWorkbook = create<State>((set, get) => ({
  progress: initialWorkbook(),
  ready: false,
  saving: 0,
  error: '',
  flush: async () => {
    await writes;
  },
  init: async () => {
    await writes.catch(() => {});
    set({ ready: false });
    try {
      const records = await workbookRepository.loadAll();
      set({ progress: records[0] || initialWorkbook(), ready: true, error: '' });
    } catch {
      set({
        ready: true,
        error: 'Не удалось прочитать прогресс сборника. Проверь доступ к хранилищу.',
      });
    }
  },
  update: async (fn) => {
    const next = { ...fn(get().progress), updatedAt: Date.now() };
    set((s) => ({ progress: next, saving: s.saving + 1 }));
    writes = writes.catch(() => {}).then(() => workbookRepository.save(next));
    try {
      await writes;
      set({ error: '' });
    } catch {
      set({ error: 'Результат пока не сохранён. Не закрывай вкладку; проверь хранилище.' });
    } finally {
      set((s) => ({ saving: Math.max(0, s.saving - 1) }));
    }
  },
}));
