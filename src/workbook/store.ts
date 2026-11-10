import { EDITION_2017, canonicalEdition } from './editions';
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
  initSource: (sourceId: string, discardPending?: boolean) => Promise<void>;
  update: (fn: (p: WorkbookProgress) => WorkbookProgress) => Promise<boolean>;
  retry: () => Promise<boolean>;
}
let writes = Promise.resolve();
let readEpoch = 0;
export const useWorkbook = create<State>((set, get) => ({
  progress: initialWorkbook(),
  ready: false,
  saving: 0,
  dirty: false,
  error: '',
  flush: async () => {
    await writes;
  },
  init: (discardPending = false) => get().initSource(EDITION_2017, discardPending),
  initSource: async (sourceId, discardPending = false) => {
    const edition = canonicalEdition(sourceId);
    const epoch = ++readEpoch;
    await writes.catch(() => {});
    if (epoch !== readEpoch) return;
    if (get().dirty && !discardPending) {
      set({ ready: true });
      return;
    }
    set({ ready: false });
    try {
      const records = await workbookRepository.loadAll();
      if (epoch !== readEpoch) return;
      set({
        progress: records.find((p) => p.sourceId === edition) || initialWorkbook(edition),
        ready: true,
        error: '',
        dirty: false,
      });
    } catch {
      if (epoch !== readEpoch) return;
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
