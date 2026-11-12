import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { it, expect } from 'vitest';
import { validateTextbookPractice } from '../scripts/validate_textbook_practice';
import {
  practiceUnits,
  accepts,
  emptyPractice,
  validatePractice,
  recordPracticeAnswer,
  advancePractice,
  restartPractice,
  TEXTBOOK_SOURCE,
  type PracticeTask,
  type PracticeAnswer,
} from '../src/textbook2026';
import {
  createTextbookPracticeRepository,
  IndexedDBProgressRepository,
  validateBundle,
} from '../src/services/storage';
import { initialProgress } from '../src/services/learning';
import { initialWorkbook } from '../src/workbook/learning';
function answer(t: PracticeTask): PracticeAnswer {
  if (t.type === 'personal')
    return Object.fromEntries(t.fields!.map((f) => [f, f === 'age' ? '9' : 'Alex']));
  if (t.type === 'matching') return Object.fromEntries(t.pairs!.map((p) => [p.en, p.ru]));
  return t.answer!;
}
it('every photographed exercise and instructional page has a source-specific authored adaptation', () => {
  expect(validateTextbookPractice()).toMatchObject({
    units: 202,
    pages: 87,
    sourceExercises: 186,
    steps: 418,
    sourcePageExerciseReferences: 187,
    allOriginalSubitemsReproduced: false,
  });
  expect(practiceUnits.find((u) => u.id === 'tb26-p40-e5')!.sourcePages).toEqual([40, 41]);
});
it('all tasks can be completed twice without reusing old course progress; review runs do not inflate full runs', () => {
  for (const u of practiceUnits) {
    let p = emptyPractice(u);
    const first = u.tasks[0];
    p = recordPracticeAnswer(
      p,
      u,
      first.id,
      first.type === 'matching' || first.type === 'personal' ? {} : 'wrong answer',
    );
    expect(p.errors).toBe(1);
    expect(p.reviewIds).toEqual([first.id]);
    for (const t of u.tasks) {
      expect(accepts(t, answer(t)), t.id).toBe(true);
      p = recordPracticeAnswer(p, u, t.id, answer(t));
      expect(recordPracticeAnswer(p, u, t.id, answer(t))).toBe(p);
      p = advancePractice(p);
      expect(advancePractice(p)).toBe(p);
    }
    expect(p.completedRuns).toBe(1);
    expect(p.reviewIds).toEqual([first.id]);
    p = restartPractice(p, u, true);
    expect(p.activeTaskIds).toEqual([first.id]);
    p = advancePractice(recordPracticeAnswer(p, u, first.id, answer(first)));
    expect(p.completedRuns).toBe(1);
    expect(p.reviewRuns).toBe(1);
    expect(p.reviewIds).toEqual([]);
    p = restartPractice(p, u);
    for (const t of u.tasks) p = advancePractice(recordPracticeAnswer(p, u, t.id, answer(t)));
    expect(p.completedRuns).toBe(2);
    expect(validatePractice([p])[0]).toEqual(p);
  }
});
it('v5 migration preserves course and workbook data; v6 practice saves, exports and imports independently', async () => {
  const name = 'tb26-migrate-' + Date.now();
  const old = new Dexie(name);
  old
    .version(5)
    .stores({ progress: 'lessonId', preferences: 'key', reader: 'sceneId', workbook: 'sourceId' });
  const course = { ...initialProgress(), seconds: 77 };
  const workbook = initialWorkbook();
  await old.table('progress').put(course);
  await old.table('workbook').put(workbook);
  old.close();
  const repo = createTextbookPracticeRepository(name);
  const u = practiceUnits[0];
  const p = await repo.update(u.id, (v) =>
    recordPracticeAnswer(v, u, u.tasks[0].id, answer(u.tasks[0])),
  );
  expect((await repo.load(u.id)).pendingAdvance).toBe(true);
  const legacy = new IndexedDBProgressRepository(name);
  expect((await legacy.load()).seconds).toBe(77);
  const bundle = validateBundle({
    schemaVersion: 2,
    selectedLessonId: course.lessonId,
    lessons: [course],
    workbook: [workbook],
    textbookPractice: await repo.loadAll(),
  });
  await legacy.replaceAll(bundle);
  expect(await repo.load(u.id)).toEqual(p);
  await legacy.replaceAll({
    schemaVersion: 2,
    selectedLessonId: course.lessonId,
    lessons: [course],
  });
  expect(await repo.load(u.id)).toEqual(p); // Older backups do not erase the new source.
  const inspect = new Dexie(name);
  await inspect.open();
  expect(await inspect.table('workbook').get(workbook.sourceId)).toEqual(workbook);
  inspect.close();
});
it('imports reject wrong sources, duplicate units and invalid task cursors without accepting fabricated completions', () => {
  const p = emptyPractice(practiceUnits[0]);
  expect(() => validatePractice([{ ...p, sourceId: 'spotlight_workbook_2026_17' }])).toThrow();
  expect(() => validatePractice([p, p])).toThrow();
  expect(() => validatePractice([{ ...p, step: 999 }])).toThrow();
  expect(() => validatePractice([{ ...p, reviewIds: ['unknown-task'] }])).toThrow();
  expect(p.sourceId).toBe(TEXTBOOK_SOURCE);
});
