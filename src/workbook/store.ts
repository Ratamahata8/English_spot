import { create } from 'zustand';
import { workbookRepository } from '../services/storage';
import { initialWorkbook } from './learning';
import type { WorkbookProgress } from './types';
interface State {
  progress: WorkbookProgress;
  ready: boolean;
  saving: number;
  dirty: boolean;
  error: string;
  init: (discardPending?: boolean) => Promise<void>;
  flush: () => Promise<void>;
  update: (fn: (p: WorkbookProgress) => WorkbookProgress) => Promise<boolean>;
  retry: () => Promise<boolean>;
}
let writes = Promise.resolve();
export const useWorkbook = create<State>((set, get) => ({
  progress: initialWorkbook(),
  ready: false,
  saving: 0,
  dirty: false,
  error: '',
  flush: async () => {
    await writes;
  },
  init: async (discardPending = false) => {
    await writes.catch(() => {});
    if (get().dirty && !discardPending) {
      set({ ready: true });
      return;
    }
    set({ ready: false });
    try {
      const records = await workbookRepository.loadAll();
      set({ progress: records[0] || initialWorkbook(), ready: true, error: '', dirty: false });
    } catch {
      set({
        ready: true,
        error: 'Не удалось прочитать прогресс сборника. Проверь доступ к хранилищу.',
      });
    }
  },
  retry: () => get().update((p) => p),
  update: async (fn) => {
    const next = { ...fn(get().progress), updatedAt: Date.now() };
    set((s) => ({ progress: next, saving: s.saving + 1, dirty: true }));
    writes = writes.catch(() => {}).then(() => workbookRepository.save(next));
    try {
      await writes;
      if (get().progress === next) set({ error: '', dirty: false });
      return true;
    } catch {
      set({ error: 'Результат пока не сохранён. Не закрывай вкладку; проверь хранилище.' });
      return false;
    } finally {
      set((s) => ({ saving: Math.max(0, s.saving - 1) }));
    }
  },
}));
