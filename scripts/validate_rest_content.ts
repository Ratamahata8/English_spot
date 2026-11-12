import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import catalog from '../src/workbook/data/edition-2026-rest-catalog.json';
import units from '../src/workbook/data/edition-2026-rest.json';
import objectives from '../docs/workbook/edition-2026-rest-objectives.json';
import manifest from '../public/audio/workbook/en-GB/manifest.json';
import { canonicalAnswer } from './validate_video_content';
import { checkTask, initialWorkbook, preparationPlan } from '../src/workbook/learning';
import { EDITION_2026 } from '../src/workbook/editions';
import { getSourceExercise, getWordForm, getSkill, englishSegments } from '../src/workbook';
import type { WorkbookExercise, SourceExercise } from '../src/workbook/types';
export function validateRestContent(checkAudio = true) {
  const require = (ok: unknown, message: string) => {
    if (!ok) throw Error(message);
  };
  require(catalog.length === 204 &&
    units.length === 204 &&
    objectives.length === 204, 'Incomplete remaining modules');
  require(new Set(units.map((e) => e.id)).size === 204, 'Duplicate adaptation IDs');
  const expected = [31, 28, 30, 30, 30, 29, 26];
  expected.forEach((count, i) =>
    require(catalog.filter((r) => r.module === String(i + 2)).length === count, 'Missing module ' +
      (i + 2)),
  );
  const audio = new Set<string>();
  const collect = (s: string) => englishSegments(s).forEach((x) => audio.add(x));
  for (const raw of catalog) {
    const r = raw as SourceExercise;
    const e = units.find((e) => r.adaptationIds.includes(e.id)) as WorkbookExercise;
    require(e && getSourceExercise(e.id)?.id === r.id, 'Wrong source link ' + r.id);
    require(raw.stages.found &&
      raw.stages.objectivesChecked &&
      !raw.stages.textChecked, 'False full source text verification ' + r.id);
    require(r.number! > 0 &&
      r.bookPage! >= 28 &&
      r.bookPage! <= 144 &&
      r.pdfPage === null, 'Invalid citation ' + r.id);
    require(/^[a-f\d]{64}$/.test(raw.frameSha256) &&
      raw.sourceFrameTimestamp >= 39 &&
      raw.sourceFrameTimestamp < 202.5, 'Missing evidence ' + r.id);
    require(e.tasks.length === raw.adaptationStepCount && e.tasks.length >= 1, 'Wrong step count ' +
      r.id);
    require(e.skillIds.every(
      (id) => !!getSkill(id) && !getSkill(id)?.planned,
    ), 'Missing active rule ' + e.id);
    preparationPlan(e.skillIds, initialWorkbook(EDITION_2026));
    require(e.wordIds.every((id) =>
      getWordForm(id)?.occurrences.some((o) => o.sourceId === EDITION_2026),
    ), 'Unsupported preparation vocabulary ' + e.id);
    require(raw.vocabularyIds.every((id) =>
      getWordForm(id)?.occurrences.some((o) => o.exerciseId === r.id),
    ), 'Invented source occurrence ' + r.id);
    collect(e.instruction);
    for (const t of e.tasks) {
      require(t.why &&
        t.hints?.length === 3 &&
        checkTask(t, canonicalAnswer(t)) &&
        !checkTask(t, {}), 'Invalid task ' + e.id);
      if (t.mode === 'choice') {
        require(t.options!.length > 1, 'No alternative ' + e.id);
        for (const text of t.options!)
          require(checkTask(t, { text }) === t.answers!.includes(text), 'False acceptance ' + e.id);
      }
      if (t.mode === 'template')
        for (let i = 0; i < t.slots!.length; i++)
          for (const v of t.slots![i].options) {
            const a = canonicalAnswer(t);
            a.values![i] = v;
            require(checkTask(t, a), 'Personal choice rejected ' + e.id);
          }
      if (t.mode === 'order')
        require(canonicalAnswer(t).order!.every((i) => i >= 0), 'Missing token ' + e.id);
      if (t.mode === 'matching')
        require(t.rows!.every((row) =>
          row.answers.every((v) => t.options!.includes(v)),
        ), 'Missing pair ' + e.id);
      if (e.mechanic !== 'letters') collect(t.prompt);
      // Validate actual spoken task content; Russian instructional prose can
      // contain isolated suffixes and fragments that are not audio assets.
      [...(t.answers || []), ...(t.options || []), ...(t.tokens || [])].forEach(collect);
      t.rows?.forEach((row) => [row.label, ...row.answers].forEach(collect));
      t.slots?.forEach((slot) => slot.options.forEach(collect));
    }
  }
  if (checkAudio)
    for (const text of audio) {
      const a = (manifest as Record<string, { path: string; sha256: string; voice: string }>)[text];
      const path = a && 'public/audio/workbook/en-GB/' + a.path;
      require(a &&
        a.voice === 'en-GB-SoniaNeural' &&
        existsSync(path) &&
        createHash('sha256').update(readFileSync(path)).digest('hex') ===
          a.sha256, 'Missing remaining-module MP3: ' + text);
    }
  return {
    modules: 7,
    adaptations: units.length,
    steps: units.reduce((n, e) => n + e.tasks.length, 0),
    audioTexts: audio.size,
  };
}
if (process.argv[1]?.endsWith('validate_rest_content.ts'))
  console.log('Remaining modules verified:', validateRestContent());
