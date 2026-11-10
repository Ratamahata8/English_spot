import 'fake-indexeddb/auto';
import { it, expect, vi } from 'vitest';
import { useWorkbook } from '../src/workbook/store';
import { workbookRepository } from '../src/services/storage';
import { initialWorkbook } from '../src/workbook/learning';
it('экспорт/импорт/сброс могут дождаться всей очереди записи сборника', async () => {
  const store = useWorkbook;
  store.setState({ progress: initialWorkbook(), ready: true, dirty: false });
  const original = workbookRepository.save.bind(workbookRepository);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const save = vi.spyOn(workbookRepository, 'save').mockImplementation(async (p) => {
    await pending;
    await original(p);
  });
  try {
    const update = store.getState().update((p) => ({ ...p, positions: { [p.currentId]: 1 } }));
    let flushed = false;
    const flush = store
      .getState()
      .flush()
      .then(() => {
        flushed = true;
      });
    await Promise.resolve();
    expect(flushed).toBe(false);
    expect(store.getState().saving).toBe(1);
    release();
    await Promise.all([update, flush]);
    expect(flushed).toBe(true);
    expect(store.getState().saving).toBe(0);
    await store.getState().init();
    expect(store.getState().progress.positions['wb-1-1a-1b-1']).toBe(1);
  } finally {
    release();
    save.mockRestore();
  }
});

it('сбой записи не теряет оптимистичный результат при переходе; повторное сохранение восстанавливает запись', async () => {
  const store = useWorkbook;
  store.setState({ progress: initialWorkbook(), ready: true, dirty: false, error: '' });
  const original = workbookRepository.save.bind(workbookRepository);
  const save = vi.spyOn(workbookRepository, 'save').mockRejectedValue(new Error('quota'));
  const load = vi.spyOn(workbookRepository, 'loadAll');
  try {
    const saved = await store
      .getState()
      .update((p) => ({ ...p, completed: [p.currentId], positions: { [p.currentId]: 1 } }));
    expect(saved).toBe(false);
    expect(store.getState().dirty).toBe(true);
    await expect(store.getState().flush()).rejects.toThrow('quota');
    await store.getState().init();
    expect(load).not.toHaveBeenCalled();
    expect(store.getState().progress.completed).toEqual(['wb-1-1a-1b-1']);
    save.mockImplementation(original);
    expect(await store.getState().retry()).toBe(true);
    expect(store.getState().dirty).toBe(false);
    await store.getState().init();
    expect(store.getState().progress.completed).toEqual(['wb-1-1a-1b-1']);
    expect(store.getState().error).toBe('');
  } finally {
    save.mockRestore();
    load.mockRestore();
  }
});
