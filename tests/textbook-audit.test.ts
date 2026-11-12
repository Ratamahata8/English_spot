import { it, expect } from 'vitest';
import catalog from '../docs/textbook-2026/photo-catalog.json';
import verifiedForms from '../docs/textbook-2026/verified-forms.json';
import {
  auditTokens,
  englishTokens,
  normalizeForm,
  requestedTextbookStatus,
  auditCurrentTextbook,
  auditExistingAudio,
} from '../scripts/audit_textbook';
it('uploaded photographs and reviewed pages do not become ready lessons or a complete vocabulary', () => {
  const r = requestedTextbookStatus();
  expect(r.photoCount).toBe(48);
  expect(r.detectedPages).toBe(94);
  expect(r.numberedPages).toBe(92);
  expect(r.unnumberedPages).toBe(2);
  expect(r.contentReviewedPages).toBe(94);
  expect(r.verifiedPages).toBe(0);
  expect(r.perspectiveCorrectionComplete).toBe(false);
  expect(r.complete).toBe(false);
  expect(r.interactivePages).toBe(0);
  expect(r.sourceId).toBe('spotlight_textbook_2026_16_part1');
});
it('preliminary confirmed forms retain page evidence without claiming a complete or published dictionary', () => {
  expect(verifiedForms.complete).toBe(false);
  expect(verifiedForms.runtimePublished).toBe(true);
  expect(verifiedForms.audioStatus).toBe('verified_sonia_static_mp3');
  expect(verifiedForms.forms.map((w) => w.en)).toContain('who');
  expect(verifiedForms.forms.find((w) => w.en === 'who')?.textbookEvidence.page).toBe(28);
  for (const w of verifiedForms.forms) {
    const p = catalog.pages.find((p) => p.printedPage === w.textbookEvidence.page);
    expect(p).toBeDefined();
    expect(p?.exerciseNumbers).toContain(w.textbookEvidence.exercise);
    expect(w.ipa).toMatch(/^\/.*\/$/);
    expect(w.ru.length).toBeGreaterThan(0);
    expect(w.textbookEvidence.sourceId).toBe(catalog.sourceId);
  }
});
it('word-form audit handles punctuation, case and contractions without replacing a missing form with its lemma', () => {
  expect(englishTokens('WHO? Who! Don’t play; playing, twenty-first.')).toEqual([
    'who',
    "don't",
    'play',
    'playing',
    'twenty-first',
  ]);
  const r = auditTokens(
    [{ scope: 'authored', context: 'example-1', text: 'Who is playing?' }],
    ['WHO', 'is', 'play'],
  );
  expect(r.missing.map((x) => x.form)).toEqual(['playing']);
  expect(r.coveragePercent).toBe(66.67);
  expect(normalizeForm('  DOESN’T ')).toBe("doesn't");
});
it('existing authored content is never assigned to textbook edition 16 without per-page validation', () => {
  const r = auditCurrentTextbook();
  expect(r.requestedSource.coveragePercent).toBeNull();
  expect(r.requestedSource.wordForms).toBeNull();
  expect(Object.keys(r.existingContent.requiredSearchAudit)).toEqual([
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
  ]);
  expect(r.existingContent.scope).toContain('NOT verified vocabulary');
});
it('audio integrity audit distinguishes existing files from an incomplete new source corpus', () => {
  const r = auditExistingAudio();
  expect(r.requestedSource.requiredClips).toBeNull();
  expect(r.requestedSource.createdClips).toBe(10);
  expect(r.requestedSource.reusedClips).toBe(8);
  expect(r.requestedSource.verifiedSubsetStrings).toBe(18);
  expect(r.existingAssets.physicalMp3Files).toBe(2493);
  expect(r.existingAssets.integrityFailures).toBe(0);
  expect(r.existingAssets.totalManifestEntries).toBeGreaterThan(0);
});
it('photograph catalogue accounts for every page face, real gaps and source archive hashes', () => {
  expect(catalog.archives.map((a) => a.images)).toEqual([9, 10, 9, 10, 10]);
  expect(new Set(catalog.photos.map((p) => p.sha256)).size).toBe(48);
  expect(catalog.pages.map((p) => p.id).sort()).toEqual(
    catalog.photos.flatMap((p) => p.pageIds).sort(),
  );
  expect(catalog.missingPages).toEqual([]);
  expect(catalog.excludedPages.map((p) => p.page)).toEqual([88, 89, 98, 99, 100, 101, 102]);
  expect(catalog.excludedPages.every((p) => !p.requiredForApplication)).toBe(true);
  const actual = catalog.pages.flatMap((p) => (p.printedPage === null ? [] : [p.printedPage]));
  expect(new Set(actual).size).toBe(92);
  expect(actual).toContain(96);
  expect(actual).toContain(97);
  const expected = Array.from({ length: 99 }, (_, i) => i + 4);
  expect(expected.filter((p) => !actual.includes(p))).toEqual(
    catalog.excludedPages.map((p) => p.page),
  );
  for (const photo of catalog.photos) {
    expect(photo.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(catalog.archives.some((a) => a.part === photo.part)).toBe(true);
    expect(photo).not.toHaveProperty('privatePath');
  }
  for (const p of catalog.pages) {
    expect(catalog.photos.some((photo) => photo.id === p.photoId)).toBe(true);
    expect(p.interactive).toBe(false);
    if (p.kind !== 'frontmatter') expect(p.objectives?.length ?? 0).toBeGreaterThan(0);
  }
});
