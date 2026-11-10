import { it, expect } from 'vitest';
import { validateRestContent } from '../scripts/validate_rest_content';
import {
  edition2026RestExercises,
  edition2026Catalog,
  all2026Exercises,
  getWordForm,
} from '../src/workbook';
import { canonicalAnswer } from '../scripts/validate_video_content';
import { checkTask, initialWorkbook, validateWorkbook } from '../src/workbook/learning';
import { EDITION_2026 } from '../src/workbook/editions';
it('modules 2–8 have a working authored adaptation for all 204 indexed objectives', () => {
  expect(validateRestContent()).toMatchObject({ modules: 7, adaptations: 204, steps: 899 });
  expect(edition2026Catalog).toHaveLength(251);
  expect(all2026Exercises).toHaveLength(255);
});
it('chapter boundaries may share a page; each exercise keeps its own lesson and number', () => {
  const on57 = edition2026Catalog.filter((r) => r.bookPage === 57);
  expect(on57.map((r) => [r.module, r.number])).toEqual([
    ['3', 18],
    ['4', 1],
  ]);
  expect(edition2026Catalog.find((r) => r.adaptationIds.includes('wb26-m8b-03'))).toMatchObject({
    bookPage: 136,
    number: 3,
    lesson: '16a-16b',
  });
});
it('all personal variants remain assisted, and rebuilding does not invalidate earlier progress', () => {
  const personal = edition2026RestExercises.find((e) => e.id === 'wb26-m8b-10')!;
  for (const t of personal.tasks) {
    expect(t.mode).toBe('template');
    const a = canonicalAnswer(t);
    expect(checkTask(t, a)).toBe(true);
  }
  const p = initialWorkbook(EDITION_2026);
  p.currentId = 'wb26-m8b-10';
  p.completed = ['wb26-m1a-01', 'wb26-m2a-01'];
  p.positions['wb26-m1a-01'] = all2026Exercises.find((e) => e.id === 'wb26-m1a-01')!.tasks.length;
  p.positions['wb26-m2a-01'] = all2026Exercises.find((e) => e.id === 'wb26-m2a-01')!.tasks.length;
  p.positions[p.currentId] = 1;
  expect(validateWorkbook([p])[0]).toMatchObject(p);
});
it('context resolves is/has and numbers do not use a plural exercise as a substitute', () => {
  const e = edition2026RestExercises.find((e) => e.id === 'wb26-m5b-07')!;
  const got = e.tasks.find((t) => t.prompt.includes('It’s got'))!;
  expect(checkTask(got, { text: 'has' })).toBe(true);
  expect(checkTask(got, { text: 'is' })).toBe(false);
  const series = edition2026RestExercises.find((e) => e.id === 'wb26-m5b-08')!;
  expect(series.tasks[0].prompt).toContain('Шаг 10');
  expect(series.skillIds).toEqual(['numbers']);
  expect(series.wordIds.map((id) => getWordForm(id)?.form.toLowerCase())).not.toContain('book');
  const ordinals = edition2026RestExercises.find((e) => e.id === 'wb26-m7b-11')!;
  expect(ordinals.tasks.flatMap((t) => t.options || [])).toEqual(
    expect.arrayContaining(['eleventh', 'twenty-first', 'thirtieth']),
  );
});
it('основные слова тематических наборов не пропускаются при подготовке и правописании', async () => {
  const { getWordForm } = await import('../src/workbook');
  for (const [id, forms] of [
    ['wb26-m2a-02', ['mum', 'dad']],
    ['wb26-m3a-02', ['chicken', 'water', 'chocolate']],
    ['wb26-m4b-02', ['TV', 'desk']],
  ] as const) {
    const e = edition2026RestExercises.find((e) => e.id === id)!;
    const answers = e.tasks.flatMap((t) => t.answers || []);
    for (const form of forms) {
      expect(answers.map((v) => v.toLowerCase())).toContain(form.toLowerCase());
      expect(e.wordIds.map((id) => getWordForm(id)?.form.toLowerCase())).toContain(
        form.toLowerCase(),
      );
    }
  }
});
