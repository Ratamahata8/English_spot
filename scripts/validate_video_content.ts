import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  edition2026Catalog,
  edition2026SourceExercises,
  edition2026Words,
  allWorkbookWords,
  getSourceExercise,
  getAllWorkbookEntities,
  getLexeme,
  getSkill,
  englishSegments,
} from '../src/workbook';
import catalog from '../src/workbook/data/edition-2026-catalog.json';
import { checkTask, initialWorkbook, preparationPlan, findWord } from '../src/workbook/learning';
import { EDITION_2026 } from '../src/workbook/editions';
import type { Answer, Task } from '../src/workbook/types';
import manifest from '../public/audio/workbook/en-GB/manifest.json';
export function canonicalAnswer(t: Task): Answer {
  if (t.mode === 'choice' || t.mode === 'text') return { text: t.answers?.[0] };
  if (t.mode === 'matching') return { values: t.rows!.map((r) => r.answers[0]) };
  if (t.mode === 'template') return { values: t.slots!.map((s) => s.options[0]) };
  if (t.mode === 'crossword') return { values: t.words!.map((w) => w.answer) };
  if (t.mode === 'wordsearch') return { found: t.placements!.map((p) => p.word) };
  const used = new Set<number>();
  const parts = t.answers![0].includes(' | ')
    ? t.answers![0].split(' | ')
    : t.answers![0].split(' ');
  return {
    order: parts.map((p) => {
      const i = t.tokens!.findIndex((v, n) => v === p && !used.has(n));
      used.add(i);
      return i;
    }),
  };
}
export function validateVideoContent(checkAudio = true) {
  const require = (ok: unknown, msg: string) => {
    if (!ok) throw Error(msg);
  };
  require(edition2026Catalog.length === 47 &&
    edition2026SourceExercises.length === 47, 'Incomplete first video block');
  require(new Set(allWorkbookWords.map((w) => w.id)).size ===
    allWorkbookWords.length, 'Shared word IDs must be unique');
  const entities = getAllWorkbookEntities();
  for (const key of ['lexemes', 'pronunciations', 'meanings', 'occurrences', 'examples'] as const)
    require(new Set(entities[key].map((e) => e.id)).size ===
      entities[key].length, 'Duplicate normalized ' + key);
  const audio = new Set<string>();
  const collect = (s: string) => englishSegments(s).forEach((t) => audio.add(t));
  for (const r of catalog) {
    const e = edition2026SourceExercises.find((e) => r.adaptationIds.includes(e.id));
    require(r.sourceId === EDITION_2026 &&
      r.bookPage >= 4 &&
      r.bookPage <= 27 &&
      r.number > 0, 'Invalid source citation ' + r.id);
    require(r.sourceFrameTimestamp >= 8 &&
      r.sourceFrameTimestamp <= 36.75 &&
      /^[a-f\d]{64}$/.test(r.frameSha256), 'Invalid evidence ' + r.id);
    require(!('framePath' in r), 'Private source path in public catalogue');
    require(e && getSourceExercise(e.id)?.id === r.id, 'Missing source/adaptation relationship ' +
      r.id);
    require(r.adaptationStepCount === e!.tasks.length, 'Adaptation count differs ' + r.id);
    require(r.vocabularyIds.every((id) =>
      edition2026Words.some((w) => w.id === id && w.occurrences.some((o) => o.exerciseId === r.id)),
    ), 'Source vocabulary without occurrence ' + r.id);
    require(r.stages.found &&
      r.stages.objectivesChecked &&
      r.stages.adaptationCreated &&
      r.stages.answerCheckReady, 'Missing independent stages ' + r.id);
    require(r.stages.textChecked ===
      (r.textVerification === 'verified'), 'Full text falsely verified ' + r.id);
    require(e!.tasks.length &&
      e!.wordIds.every((id) =>
        edition2026Words.some((w) => w.id === id),
      ), 'Preparation words outside selected edition ' + r.id);
    require(e!.skillIds.every(
      (id) => getSkill(id) && !getSkill(id)?.planned,
    ), 'Missing active preparation ' + r.id);
    preparationPlan(e!.skillIds, initialWorkbook(EDITION_2026));
    for (const t of e!.tasks) {
      require(t.why && checkTask(t, canonicalAnswer(t)) && !checkTask(t, {}), 'Broken checker ' +
        e!.id);
      if (t.mode === 'choice')
        require(t.options!.every(
          (v) => checkTask(t, { text: v }) === t.answers!.includes(v),
        ), 'Choice checker disagrees ' + e!.id);
      if (t.mode === 'matching')
        require(t.options?.length &&
          t.rows!.every((r) =>
            r.answers.every((a) => t.options!.includes(a)),
          ), 'Missing matching options ' + e!.id);
      if (t.mode === 'order')
        require(canonicalAnswer(t).order!.every((i) => i >= 0), 'Missing token ' + e!.id);
      if (t.mode === 'wordsearch')
        for (const p of t.placements!)
          require(findWord(t, p.start, p.end) === p.word, 'Missing grid word');
      if (!['letters', 'anagram'].includes(e!.mechanic)) collect(t.prompt);
      [...(t.answers || []), ...(t.options || []), ...(t.tokens || []), ...(t.hints || [])].forEach(
        collect,
      );
      t.rows?.forEach((r) => [r.label, ...r.answers].forEach(collect));
      t.slots?.forEach((s) => s.options.forEach(collect));
      t.placements?.forEach((p) => collect(p.word));
      t.words?.forEach((w) => collect(w.answer));
    }
  }
  for (const w of edition2026Words) {
    require(w.ipaReview === 'reviewed' && w.ipa && !/[а-яё\d]/i.test(w.ipa), 'Invalid IPA ' +
      w.form);
    require(!!getLexeme(w.lexemeId), 'Missing base ' + w.form);
    require(w.occurrences.length, 'Missing source word evidence ' + w.form);
    for (const o of w.occurrences.filter((o) => o.verification === 'video-visual'))
      require(edition2026Catalog.some(
        (r) => r.id === o.exerciseId && r.printedPages?.includes(o.bookPage!),
      ), 'Wrong occurrence ' + w.form);
    [w.form, w.lemma, w.example.en].forEach(collect);
  }
  if (checkAudio)
    for (const text of audio) {
      const a = (manifest as Record<string, { path: string; sha256: string; voice: string }>)[text];
      const path = a && 'public/audio/workbook/en-GB/' + a.path;
      require(a &&
        a.voice === 'en-GB-SoniaNeural' &&
        existsSync(path) &&
        createHash('sha256').update(readFileSync(path)).digest('hex') ===
          a.sha256, 'Missing video MP3 ' + text);
    }
  return {
    sourceExercises: catalog.length,
    adaptations: edition2026SourceExercises.length,
    steps: edition2026SourceExercises.reduce((n, e) => n + e.tasks.length, 0),
    sourceForms: edition2026Words.length,
    videoVerifiedForms: edition2026Words.filter((w) =>
      w.occurrences.some((o) => o.verification === 'video-visual'),
    ).length,
    requiredAudio: audio.size,
  };
}
if (process.argv[1]?.endsWith('validate_video_content.ts'))
  console.log('Video content verified:', validateVideoContent());
