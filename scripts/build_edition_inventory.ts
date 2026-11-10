import { writeFileSync } from 'node:fs';
import { lessons } from '../src/lessons';
import { workbookExercises } from '../src/workbook';
import mappings from '../src/workbook/data/edition-mappings.json';
const legacy = lessons.flatMap((l) =>
  l.exercises.map((e) => ({
    interactiveId: e.id,
    lessonId: l.id,
    sourceKind: 'original-app-lesson',
    oldWorkbookExerciseId: null,
    newExerciseId: null,
    newPrintedPage: null,
    newExerciseNumber: null,
    status: 'unverified',
    reason:
      'Авторское задание прежнего приложения, точное соответствие сборнику 2026 не подтверждено.',
  })),
);
const workbook = workbookExercises.map((e) => ({
  interactiveId: e.id,
  lessonId: null,
  sourceKind: 'workbook-2017-adaptation',
  oldWorkbookExerciseId: e.id,
  newExerciseId: null,
  newPrintedPage: null,
  newExerciseNumber: null,
  status: 'unverified',
  reason: 'Нет читаемого источника конкретного упражнения 2026.',
}));
writeFileSync(
  'docs/workbook/edition-2026-inventory.json',
  JSON.stringify(
    {
      schemaVersion: 1,
      existingInteractiveCount: legacy.length + workbook.length,
      confirmedComparisons: 0,
      confirmedIdentical: 0,
      confirmedChanged: 0,
      unverified: legacy.length + workbook.length,
      oldSourceIndexCount: mappings.mappings.length,
      exercises: [...legacy, ...workbook],
    },
    null,
    2,
  ) + '\n',
);
