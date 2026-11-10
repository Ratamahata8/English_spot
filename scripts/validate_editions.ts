import mappings from '../src/workbook/data/edition-mappings.json';
import inventory from '../docs/workbook/edition-2026-inventory.json';
import {
  edition2026Sections,
  EDITION_2017,
  EDITION_2026,
  sectionForPage2026,
} from '../src/workbook/editions';
import {
  edition2026Exercises,
  edition2026References,
  edition2026Words,
  sourceExercises,
  getWordForm,
  getSkill,
  englishSegments,
} from '../src/workbook';
import { checkTask } from '../src/workbook/learning';
import manifest from '../public/audio/workbook/en-GB/manifest.json';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function validateEditions(checkAudio = true) {
  const require = (ok: unknown, msg: string) => {
    if (!ok) throw Error(msg);
  };
  require(JSON.stringify(edition2026Sections.map((s) => s.start)) ===
    JSON.stringify([4, 18, 28, 42, 57, 73, 90, 108, 126]), 'Incorrect 2026 navigation');
  require(edition2026Sections.at(-1)?.end === null, 'Unknown final page must remain unknown');
  require(mappings.mappings.length === sourceExercises.length, 'Incomplete old-source audit');
  for (const m of mappings.mappings)
    require(m.status === 'unverified'
      ? m.newExerciseId === null && m.newPrintedPage === null && m.newExerciseNumber === null
      : m.status === 'modified' &&
          m.newExerciseId !== null &&
          m.conditionsChanged === true, 'Unproven edition correspondence ' + m.oldExerciseId);
  require(inventory.existingInteractiveCount === 543 &&
    inventory.exercises.length === 543 &&
    inventory.confirmedComparisons === 0, 'Incorrect interactive inventory');
  require(inventory.exercises.every(
    (e) => e.status === 'unverified' && e.newExerciseNumber === null,
  ), 'False interactive correspondence');
  require(new Set(edition2026Exercises.map((e) => e.id)).size === 4, 'Duplicate new IDs');
  const used = new Set<string>();
  const audio = (s: string) => englishSegments(s).forEach((x) => used.add(x));
  for (const e of edition2026Exercises) {
    const ref = edition2026References.find((r) => r.id === e.id);
    require(ref &&
      ref.sourceId === EDITION_2026 &&
      ref.bookPage === null &&
      ref.pdfPage === null &&
      ref.number === null &&
      ref.sourceExerciseVerification ===
        'unverified', 'Author training disguised as a source exercise');
    require(ref!.printedPages?.every(
      (p) => sectionForPage2026(p)?.module === ref!.module,
    ), 'Wrong module range');
    require(e.wordIds.every((id) => !!getWordForm(id)), 'Unknown preparation word');
    require(e.skillIds.every(
      (id) => getSkill(id)?.practice?.length === 2,
    ), 'Missing new preparation');
    for (const t of e.tasks) {
      require(t.hints?.length === 3 &&
        !!t.answerIpa &&
        !/[а-яё]/i.test(t.answerIpa), 'Missing hints or UK IPA');
      require(checkTask(t, { text: t.answers![0] }) &&
        !checkTask(t, {
          text: t.options!.find((o) => !t.answers!.includes(o)),
        }), 'Broken answer check');
      [t.prompt, ...t.options!, ...t.hints!].forEach(audio);
    }
  }
  for (const w of edition2026Words) {
    require(w.ipaReview === 'reviewed' && !!w.ipa, 'Missing pronunciation');
    require(w.occurrences.length &&
      w.occurrences.every(
        (o) =>
          o.sourceId === EDITION_2026 &&
          (o.verification === 'audit-report' ||
            (o.verification === 'video-visual' &&
              o.bookPage !== null &&
              o.exerciseNumber !== null)),
      ), 'Unconfirmed new lexicon ' + w.form);
    [w.form, w.lemma, w.example.en].forEach(audio);
  }
  if (checkAudio)
    for (const text of used) {
      const a = (manifest as Record<string, { path: string; sha256: string; voice: string }>)[text];
      const path = a && 'public/audio/workbook/en-GB/' + a.path;
      require(a &&
        a.voice === 'en-GB-SoniaNeural' &&
        existsSync(path) &&
        createHash('sha256').update(readFileSync(path)).digest('hex') ===
          a.sha256, 'Missing or corrupt edition MP3: ' + text);
    }
  return {
    editions: [EDITION_2017, EDITION_2026],
    oldSourceExercises: sourceExercises.length,
    existingInteractiveAudited: 543,
    verifiedExerciseCorrespondences: mappings.mappings.filter((m) => m.status !== 'unverified')
      .length,
    unverifiedExistingInteractive: 543,
    newAuthoredTrainings: edition2026Exercises.length,
    newTrainingSteps: edition2026Exercises.reduce((n, e) => n + e.tasks.length, 0),
    newConfirmedForms: edition2026Words.length,
  };
}
if (process.argv[1]?.endsWith('validate_editions.ts'))
  console.log('Edition audit verified:', validateEditions());
