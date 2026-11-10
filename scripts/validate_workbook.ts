import provider from '../src/workbook/data/audio-provider.json';
import { workbookEntities } from '../src/workbook';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import coverage from '../content-coverage.json';
import corpus from '../src/workbook/data/audio-texts.json';
import manifest from '../public/audio/workbook/en-GB/manifest.json';
import {
  sourceExercises,
  workbookExercises,
  workbookWords,
  workbookSkills,
  getSourceExercise,
  getSkill,
  englishSegments,
} from '../src/workbook';
import { preparationPlan, initialWorkbook, checkTask, findWord } from '../src/workbook/learning';
import type { Answer } from '../src/workbook/types';
import type { AudioAsset } from '../src/types';
export function validateWorkbookContent(checkAudio = true) {
  const errors: string[] = [];
  const require = (condition: unknown, msg: string) => {
    if (!condition) errors.push(msg);
  };
  require(coverage.sourcePdfPages === 129, 'Source PDF must have 129 pages');
  require(new Set(sourceExercises.map((e) => e.id)).size ===
    sourceExercises.length, 'Duplicate source IDs');
  require(sourceExercises.length === 313, 'Source index count changed; review all pages');
  for (const e of sourceExercises) {
    require(e.bookPage !== null && e.pdfPage === e.bookPage + 1, 'Wrong source page ' + e.id);
    require(e.bookPage !== null && e.bookPage >= 4 && e.bookPage <= 127, 'Invalid book page ' +
      e.id);
    require(e.skillIds.every((id) => !!getSkill(id)), 'Unknown skill ' + e.id);
    require(['not_started', 'in_progress', 'implemented', 'reviewed', 'blocked'].includes(
      e.status,
    ), 'Invalid status ' + e.id);
    const real = workbookExercises.find((x) => x.id === e.id);
    require(!['implemented', 'reviewed'].includes(e.status) || !!real, 'False readiness ' + e.id);
    require(!real || ['implemented', 'reviewed'].includes(e.status), 'Untracked adaptation ' +
      e.id);
  }
  require(workbookEntities.pronunciations.length ===
    workbookWords.length, 'Pronunciation relationships missing');
  for (const lexeme of workbookEntities.lexemes)
    require(lexeme.wordFormIds.every((id) =>
      workbookWords.some((w) => w.id === id && w.lexemeId === lexeme.id),
    ), 'Invalid lexeme relationship ' + lexeme.id);
  for (const pronunciation of workbookEntities.pronunciations)
    require(workbookWords.some(
      (w) => w.id === pronunciation.wordFormId && w.ipa === pronunciation.ipa,
    ), 'IPA relationship differs');
  const sourceIds = new Set(sourceExercises.map((e) => e.id)),
    formIds = new Set(workbookWords.map((w) => w.id));
  require(formIds.size === workbookWords.length, 'Duplicate forms');
  require(new Set(workbookWords.map((w) => w.form.toLowerCase())).size ===
    workbookWords.length, 'Duplicate spelling');
  for (const w of workbookWords) {
    require(!!w.ipa && !/[а-яё0-9]/i.test(w.ipa), 'IPA missing or suspect ' + w.form);
    require(w.ipaReview === 'reviewed', 'IPA not checked ' + w.form);
    require(w.occurrences.length > 0, 'No source occurrence ' + w.form);
    for (const o of w.occurrences) {
      const source = getSourceExercise(o.exerciseId);
      require(sourceIds.has(o.exerciseId) && o.verification === 'visual', 'Unconfirmed form ' +
        w.form);
      require(o.bookPage !== null &&
        o.pdfPage === o.bookPage + 1 &&
        !!source &&
        (source.bookPage === o.bookPage ||
          source.continuationPages.includes(o.bookPage)), 'Incorrect occurrence ' + w.form);
      require(o.text.toLowerCase() === w.form.toLowerCase(), 'Source spelling differs ' + w.form);
    }
    for (const m of w.meanings.filter((m) => m.when !== 'default'))
      require(!!m.occurrence &&
        sourceIds.has(m.occurrence.exerciseId) &&
        m.occurrence.verification === 'visual', 'Unverified context ' + w.form);
  }
  preparationPlan(
    workbookSkills.map((s) => s.id),
    initialWorkbook(),
  );
  const audio = manifest as Record<string, AudioAsset>;
  const used = new Set<string>();
  const audioText = (text: string) => englishSegments(text).forEach((s) => used.add(s));
  for (const w of workbookWords) {
    [w.form, w.lemma, w.example.en].forEach(audioText);
  }
  for (const s of workbookSkills) {
    if (s.planned) continue;
    require(s.practice?.length &&
      s.practice.length >= 2 &&
      s.practice.length <= 4, 'Training questions missing ' + s.id);
    require(s.example?.en && s.example.ru && s.explanation, 'Missing explanation ' + s.id);
    audioText(s.example!.en);
    audioText(s.explanation!);
    for (const q of s.practice!) {
      require(q.options.includes(q.answer), 'Invalid preparation answer ' + s.id);
      audioText(q.prompt);
      q.options.forEach(audioText);
    }
  }
  for (const e of workbookExercises) {
    require(e.tasks.length > 0, 'No tasks ' + e.id);
    require(e.wordIds.every((id) => formIds.has(id)), 'Unknown dictionary link ' + e.id);
    require(e.skillIds.every(
      (id) => !!getSkill(id) && !getSkill(id)?.planned,
    ), 'Missing preparation ' + e.id);
    for (const t of e.tasks) {
      let answer: Answer = {};
      require(!!t.why, 'No explanation ' + e.id);
      if (!['letters', 'anagram'].includes(e.mechanic)) audioText(t.prompt);
      [...(t.answers || []), ...(t.options || []), ...(t.tokens || [])].forEach(audioText);
      if (t.mode === 'text' || t.mode === 'choice') {
        require(t.answers?.length, 'Missing answers ' + e.id);
        answer = { text: t.answers?.[0] };
        if (t.mode === 'choice')
          require(t.options?.includes(t.answers![0]), 'Correct option absent ' + e.id);
      }
      if (t.mode === 'order') {
        const parts = t.answers![0].includes(' | ')
          ? t.answers![0].split(' | ')
          : t.answers![0].split(' ');
        const taken = new Set<number>();
        answer = {
          order: parts.map((part) => {
            const i = t.tokens!.findIndex((token, n) => token === part && !taken.has(n));
            taken.add(i);
            return i;
          }),
        };
      }
      if (t.mode === 'matching') {
        answer = { values: t.rows!.map((r) => r.answers[0]) };
        for (const r of t.rows!) {
          require(r.answers.every((a) => t.options!.includes(a)), 'Matching option missing ' +
            e.id);
          [r.label, ...r.answers].forEach(audioText);
        }
      }
      if (t.mode === 'template') {
        answer = { values: t.slots!.map((s) => s.options[0]) };
        t.slots!.forEach((s) => s.options.forEach(audioText));
      }
      if (t.mode === 'crossword') {
        answer = { values: t.words!.map((w) => w.answer) };
        const cells = new Map<string, string>();
        for (const w of t.words!) {
          audioText(w.answer);
          for (let i = 0; i < w.answer.length; i++) {
            const cell =
              w.row +
              (w.direction === 'down' ? i : 0) +
              ',' +
              (w.col + (w.direction === 'across' ? i : 0));
            require(!cells.has(cell) ||
              cells.get(cell) === w.answer[i], 'Crossword intersection conflict ' + e.id);
            cells.set(cell, w.answer[i]);
          }
        }
      }
      if (t.mode === 'wordsearch') {
        answer = { found: t.placements!.map((p) => p.word) };
        for (const p of t.placements!) {
          audioText(p.word);
          require(findWord(t, p.start, p.end) === p.word, 'Word not present in grid ' + e.id);
        }
      }
      require(checkTask(t, answer), 'Canonical answer fails ' + e.id);
      require(!checkTask(t, {}), 'Empty answer accepted ' + e.id);
    }
  }
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(audioText);
  require([...used].every((text) => corpus.includes(text)), 'Runtime audio corpus missing text: ' +
    [...used].filter((t) => !corpus.includes(t)).join('; '));
  if (checkAudio) {
    require(Object.keys(audio).sort().join('\n') ===
      [...corpus].sort().join('\n'), 'Manifest/corpus mismatch');
    for (const text of corpus) {
      const a = audio[text];
      if (!a) {
        errors.push('Missing MP3 ' + text);
        continue;
      }
      require(a.text === text && a.voice === provider.voice, 'Wrong audio metadata ' + text);
      const path = 'public/audio/workbook/en-GB/' + a.path;
      require(existsSync(path), 'Missing file ' + text);
      if (existsSync(path)) {
        const bytes = readFileSync(path);
        require(bytes.length > 500 &&
          createHash('sha256').update(bytes).digest('hex') === a.sha256, 'Invalid checksum ' +
          text);
      }
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
  return {
    sourceExercises: sourceExercises.length,
    adapted: workbookExercises.length,
    tasks: workbookExercises.reduce((n, e) => n + e.tasks.length, 0),
    forms: workbookWords.length,
    lexemes: new Set(workbookWords.map((w) => w.lexemeId)).size,
    phrases: workbookWords.filter((w) => w.partOfSpeech === 'выражение').length,
    requiredAudio: corpus.length,
  };
}
if (process.argv[1]?.endsWith('validate_workbook.ts'))
  console.log('Workbook content verified:', validateWorkbookContent());
