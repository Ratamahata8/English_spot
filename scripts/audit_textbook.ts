/** Read-only audit of existing content; never promotes it into the photographed textbook. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { lessons, lexicon } from '../src/lessons';
import { scenes } from '../src/textbook';
import { allWorkbookExercises, allWorkbookWords, wordsForEdition } from '../src/workbook';
import { EDITION_2017, EDITION_2026 } from '../src/workbook/editions';
import sourceAccess from '../docs/textbook-2026/source-access.json';
import photoCatalog from '../docs/textbook-2026/photo-catalog.json';
import verifiedForms from '../docs/textbook-2026/verified-forms.json';
export function normalizeForm(value: string) {
  return value.normalize('NFKC').replace(/[’‘]/g, "'").trim().toLowerCase();
}
export function englishTokens(value: string) {
  return [
    ...new Set(
      (value.match(/[A-Za-z]+(?:['’‘][A-Za-z]+)*(?:-[A-Za-z]+)*/g) || []).map(normalizeForm),
    ),
  ];
}
interface Segment {
  context: string;
  text: string;
  scope: string;
}
export function auditTokens(segments: Segment[], forms: string[]) {
  const known = new Set(forms.map(normalizeForm));
  const occurrences = new Map<string, Set<string>>();
  for (const s of segments)
    for (const token of englishTokens(s.text)) {
      const contexts = occurrences.get(token) || new Set<string>();
      contexts.add(s.scope + ':' + s.context);
      occurrences.set(token, contexts);
    }
  const missing = [...occurrences]
    .filter(([form]) => !known.has(form))
    .map(([form, contexts]) => ({ form, contexts: [...contexts].sort() }))
    .sort((a, b) => a.form.localeCompare(b.form));
  return {
    uniqueTokens: occurrences.size,
    resolvedTokens: occurrences.size - missing.length,
    coveragePercent: occurrences.size
      ? Number((((occurrences.size - missing.length) / occurrences.size) * 100).toFixed(2))
      : null,
    missingCount: missing.length,
    missing,
  };
}
export function requestedTextbookStatus() {
  return {
    sourceId: sourceAccess.sourceId,
    sourceAccess,
    photoCount: photoCatalog.photos.length,
    downloadedPhotos: photoCatalog.photos.length,
    detectedPages: photoCatalog.pages.length,
    numberedPages: photoCatalog.pages.filter((p) => p.printedPage !== null).length,
    unnumberedPages: photoCatalog.pages.filter((p) => p.printedPage === null).length,
    contentReviewedPages: photoCatalog.pages.filter((p) => p.textVisuallyRead).length,
    verifiedPages: photoCatalog.pages.filter((p) => p.wordFormsValidated).length,
    preparedLessons: 0,
    interactivePages: 0,
    pagesAwaitingReview: photoCatalog.pages.filter((p) => !p.wordFormsValidated).length,
    missingPages: photoCatalog.missingPages,
    unreadablePages: photoCatalog.unreadablePages,
    perspectiveCorrectionComplete: false,
    complete: false,
    reason:
      'All uploaded photos were visually reviewed and mapped. Exhaustive word-form validation, perspective correction and new interactive lessons remain incomplete. Seven expected numbered pages are absent.',
  };
}
export function auditCurrentTextbook() {
  const course: Segment[] = [];
  const workbook: Segment[] = [];
  const comics: Segment[] = [];
  const add = (out: Segment[], scope: string, context: string, text?: string) => {
    if (text) out.push({ scope, context, text });
  };
  for (const l of lessons) {
    for (const w of [...l.vocabulary, ...l.lexicon]) {
      add(course, 'authored-course', l.id + ':' + w.id, w.en);
      add(course, 'authored-course', l.id + ':' + w.id + ':example', w.example);
    }
    for (const g of l.grammar)
      for (const [i, v] of g.examples.entries())
        add(course, 'authored-course', l.id + ':' + g.id + ':' + i, v);
    for (const e of l.exercises) {
      if (e.type !== 'letters')
        add(course, 'authored-course', l.id + ':' + e.id + ':prompt', e.prompt);
      add(course, 'authored-course', l.id + ':' + e.id + ':answer', e.answer);
      add(course, 'authored-course', l.id + ':' + e.id + ':help', e.hint.example);
    }
    for (const r of l.remedial.filter((r) => r.available)) {
      add(course, 'authored-course', l.id + ':' + r.id + ':example', r.example);
      add(course, 'authored-course', l.id + ':' + r.id + ':answer', r.answer);
    }
  }
  for (const s of scenes)
    for (const l of s.lines) {
      add(comics, 'legacy-comics-edition-not-verified', s.id + ':' + l.id, l.en);
      for (const c of l.chunks)
        add(comics, 'legacy-comics-edition-not-verified', s.id + ':' + l.id + ':chunk', c.en);
    }
  for (const e of allWorkbookExercises)
    for (const [i, t] of e.tasks.entries()) {
      const scope = e.id.startsWith('wb26-')
        ? 'workbook-2026-authored-practice'
        : 'workbook-2017-authored-practice';
      const id = e.id + ':' + i;
      if (!['letters', 'anagram'].includes(e.mechanic))
        add(workbook, scope, id + ':prompt', t.prompt);
      add(workbook, scope, id + ':explanation', t.why);
      t.answers?.forEach((v) => add(workbook, scope, id + ':answer', v));
      t.rows?.forEach((r) => {
        add(workbook, scope, id + ':label', r.label);
        r.answers.forEach((v) => add(workbook, scope, id + ':pair', v));
      });
      t.slots?.forEach((s) =>
        s.options.forEach((v) => add(workbook, scope, id + ':personal-option', v)),
      );
      t.placements?.forEach((p) => add(workbook, scope, id + ':grid-word', p.word));
      t.words?.forEach((w) => add(workbook, scope, id + ':crossword', w.answer));
    }
  const allEntries = [
    ...lexicon.map((w) => ({ form: w.en, ipa: w.ipa, ru: w.ru })),
    ...allWorkbookWords.map((w) => ({ form: w.form, ipa: w.ipa, ru: w.meanings[0].ru })),
  ];
  const unique = new Map(allEntries.map((w) => [normalizeForm(w.form), w]));
  const questions = [
    'who',
    'what',
    'where',
    'when',
    'why',
    'how',
    'is',
    'are',
    'have',
    'has',
    'do',
    'does',
  ];
  const searchIndexes = {
    courseVisible: lexicon.map((w) => w.en),
    courseHints: lexicon.map((w) => w.en),
    workbook2017: wordsForEdition(EDITION_2017).map((w) => w.form),
    workbook2026: wordsForEdition(EDITION_2026).map((w) => w.form),
  };
  return {
    schemaVersion: 1,
    requestedSource: {
      sourceId: sourceAccess.sourceId,
      accessStatus: sourceAccess.status,
      uniqueWords: null,
      wordForms: null,
      phrases: null,
      coveragePercent: null,
      formsWithIpa: null,
      formsWithAudio: null,
      individuallyConfirmedForms: verifiedForms.forms.length,
      confirmedFormsRuntimePublished: verifiedForms.runtimePublished,
      confirmedFormsAudioStatus: verifiedForms.audioStatus,
      missingWords: null,
      complete: false,
    },
    existingContent: {
      scope:
        'Existing authored practice and legacy materials, NOT verified vocabulary of the new textbook photographs',
      courseLessons: lessons.length,
      courseExercises: lessons.reduce((n, l) => n + l.exercises.length, 0),
      workbookExercises: allWorkbookExercises.length,
      legacyComicPages: scenes.length,
      uniqueDictionaryForms: unique.size,
      formsWithIpaAndMeaning: [...unique.values()].filter((w) => w.ipa && w.ru).length,
      phraseForms: [...unique.keys()].filter((v) => v.includes(' ')).length,
      indexSizes: Object.fromEntries(Object.entries(searchIndexes).map(([k, v]) => [k, v.length])),
      requiredSearchAudit: Object.fromEntries(
        questions.map((q) => [
          q,
          Object.fromEntries(
            Object.entries(searchIndexes).map(([k, v]) => [
              k,
              v.some((x) => normalizeForm(x) === q),
            ]),
          ),
        ]),
      ),
      courseAtomicFormCoverage: auditTokens(course, searchIndexes.courseHints),
      comicAtomicFormCoverage: auditTokens(comics, searchIndexes.courseHints),
      workbookAtomicFormCoverage: auditTokens(
        workbook,
        allWorkbookWords.map((w) => w.form),
      ),
    },
    existingComicHintIntegration: {
      globalPerWordHints: false,
      comparisonIndex: 'courseHints',
      note: 'Legacy comic reader renders its own dialogue help, not EnglishText word tokens.',
    },
    exclusions: [
      'Atomic-token coverage requires an independent word-form entry; whole-phrase help may still cover a phrase component.',
      'Incorrect multiple-choice distractors are not promoted into legitimate word forms.',
      'Letter fragments and crossword filler are not lexical evidence.',
      'No existing material is treated as evidence for textbook 2026 edition 16.',
    ],
  };
}
export function auditExistingAudio() {
  const groups = ['en-GB', 'workbook/en-GB', 'textbook/en-GB', 'textbook/ru-RU'];
  const assets = groups.map((group) => {
    const folder = fileURLToPath(new URL('../public/audio/' + group + '/', import.meta.url));
    const manifest = JSON.parse(readFileSync(resolve(folder, 'manifest.json'), 'utf8')) as Record<
      string,
      { path: string; sha256: string; voice: string }
    >;
    const failures = Object.entries(manifest).flatMap(([text, a]) => {
      const path = resolve(folder, a.path);
      if (!existsSync(path)) return [{ text, path: a.path, error: 'missing_file' }];
      if (createHash('sha256').update(readFileSync(path)).digest('hex') !== a.sha256)
        return [{ text, path: a.path, error: 'sha256_mismatch' }];
      return [];
    });
    return { group, manifestEntries: Object.keys(manifest).length, failures };
  });
  return {
    schemaVersion: 1,
    requestedSource: {
      sourceId: sourceAccess.sourceId,
      requiredClips: null,
      createdClips: 0,
      coveragePercent: null,
      complete: false,
      reason:
        'Photographs are available; the complete validated vocabulary and sentence corpus is not yet established. Shared dictionary additions are counted only under existing assets.',
    },
    existingAssets: {
      totalManifestEntries: assets.reduce((n, a) => n + a.manifestEntries, 0),
      integrityFailures: assets.reduce((n, a) => n + a.failures.length, 0),
      checks:
        'Existence and SHA256 only; this command does not claim MP3 decoding or browser playback.',
      groups: assets,
    },
  };
}
export function writeAuditReports() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const reports = {
    'textbook-coverage.json': requestedTextbookStatus(),
    'vocabulary-coverage.json': auditCurrentTextbook(),
    'audio-coverage.json': auditExistingAudio(),
  };
  for (const [name, report] of Object.entries(reports))
    writeFileSync(resolve(root, name), JSON.stringify(report, null, 2) + '\n');
  return reports;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = writeAuditReports();
  console.log(
    JSON.stringify(
      {
        source: r['textbook-coverage.json'].sourceId,
        sourceStatus: sourceAccess.status,
        sourceCoverage: null,
        existingIndexes: r['vocabulary-coverage.json'].existingContent.indexSizes,
        existingAudio: r['audio-coverage.json'].existingAssets.totalManifestEntries,
      },
      null,
      2,
    ),
  );
}
