import { it, expect } from 'vitest';
import { validateVideoContent, canonicalAnswer } from '../scripts/validate_video_content';
import {
  edition2026SourceExercises,
  edition2026Catalog,
  allWorkbookWords,
  getAllWorkbookEntities,
} from '../src/workbook';
import { checkTask, initialWorkbook, validateWorkbook } from '../src/workbook/learning';
import { EDITION_2026 } from '../src/workbook/editions';
it('47 адаптаций из видео имеют реальную ссылку, подготовку, проверку и статические MP3', () => {
  expect(validateVideoContent()).toMatchObject({
    sourceExercises: 47,
    adaptations: 47,
    steps: 236,
    sourceForms: 314,
    videoVerifiedForms: 308,
  });
  expect(edition2026Catalog.filter((r) => r.module === 'intro')).toHaveLength(18);
  expect(edition2026Catalog.filter((r) => r.module === 'entry')).toHaveLength(6);
  expect(edition2026Catalog.filter((r) => r.module === '1')).toHaveLength(23);
});
it('новые условия модуля 1 заменяют старый вариант, а множественные верные ответы принимаются', () => {
  const by = (id: string) => edition2026SourceExercises.find((e) => e.id === id)!;
  expect(by('wb26-m1a-03').tasks).toHaveLength(8);
  expect(by('wb26-m1a-03').tasks.every((t) => t.mode === 'order')).toBe(true);
  expect(by('wb26-m1a-04').tasks[0].tokens).toHaveLength(4);
  expect(by('wb26-m1b-06').tasks).toHaveLength(7);
  expect(by('wb26-m1b-10').tasks).toHaveLength(6);
  const t = by('wb26-m1b-04').tasks[0];
  const a = canonicalAnswer(t);
  a.values![0] = 'listen';
  expect(checkTask(t, a)).toBe(true);
  a.values![0] = 'run';
  expect(checkTask(t, a)).toBe(true);
  a.values![0] = 'purple';
  expect(checkTask(t, a)).toBe(false);
});
it('общие слова не создают дубликатов связей; существующие тренировки и прогресс остаются допустимыми', () => {
  expect(new Set(allWorkbookWords.map((w) => w.id)).size).toBe(allWorkbookWords.length);
  const entities = getAllWorkbookEntities();
  for (const list of Object.values(entities))
    expect(new Set(list.map((v) => v.id)).size).toBe(list.length);
  const fresh = initialWorkbook(EDITION_2026);
  expect(fresh.currentId).toBe('wb26-intro-01');
  const old = {
    ...fresh,
    currentId: 'wb26-past-question',
    positions: { 'wb26-past-question': 3, 'wb26-there-past': 6 },
    completed: ['wb26-there-past'],
    hintCount: 9,
  };
  expect(validateWorkbook([old])[0]).toMatchObject(old);
  expect(initialWorkbook(EDITION_2026).completed).toEqual([]);
});
