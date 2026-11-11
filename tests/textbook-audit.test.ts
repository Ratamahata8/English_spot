import { it, expect } from 'vitest';
import {
  auditTokens,
  englishTokens,
  normalizeForm,
  requestedTextbookStatus,
  auditCurrentTextbook,
  auditExistingAudio,
} from '../scripts/audit_textbook';
it('unknown photograph totals cannot become zero, full coverage or ready lessons', () => {
  const r = requestedTextbookStatus();
  expect(r.photoCount).toBeNull();
  expect(r.detectedPages).toBeNull();
  expect(r.complete).toBe(false);
  expect(r.interactivePages).toBe(0);
  expect(r.sourceId).toBe('spotlight_textbook_2026_16_part1');
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
it('existing authored content is never assigned to textbook edition 16 without photographs', () => {
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
it('audio integrity audit distinguishes existing files from audio for the unavailable source', () => {
  const r = auditExistingAudio();
  expect(r.requestedSource.requiredClips).toBeNull();
  expect(r.requestedSource.createdClips).toBe(0);
  expect(r.existingAssets.integrityFailures).toBe(0);
  expect(r.existingAssets.totalManifestEntries).toBeGreaterThan(0);
});
