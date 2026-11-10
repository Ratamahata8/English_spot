import newContent from './data/edition-2026-exercises.json';
import newReferences from './data/edition-2026-references.json';
import newWords from './data/edition-2026-lexicon.json';
import newSkills from './data/edition-2026-skills.json';
import newEntities from './data/edition-2026-entities.json';
import { EDITION_2017, EDITION_2026, exerciseEdition } from './editions';
import entities from './data/entities.json';
import coverage from '../../content-coverage.json';
import content from './data/module-one.json';
import dictionary from './data/lexicon.json';
import registry from './data/skills.json';
import type { SourceExercise, WorkbookExercise, WordForm, Skill } from './types';
export const SOURCE_ID = EDITION_2017;
export const edition2026Exercises = newContent as WorkbookExercise[];
export const edition2026References = newReferences as SourceExercise[];
export const edition2026Words = newWords as WordForm[];
export const sourceExercises = (coverage.exercises as SourceExercise[]).map((e) => ({
  ...e,
  sourceId: EDITION_2017,
}));
export const workbookExercises = content as WorkbookExercise[];
export const workbookWords = (dictionary as WordForm[]).map((w) => ({
  ...w,
  occurrences: w.occurrences.map((o) => ({ ...o, sourceId: EDITION_2017 })),
}));
export const allWorkbookWords = [...workbookWords, ...edition2026Words];
export const allWorkbookExercises = [...workbookExercises, ...edition2026Exercises];
export const exercisesForEdition = (id: string) =>
  id === EDITION_2026 ? edition2026Exercises : workbookExercises;
export const wordsForEdition = (id: string) =>
  id === EDITION_2026 ? edition2026Words : workbookWords;
export const workbookSkills = [...registry, ...newSkills] as Skill[];
export const getWorkbookExercise = (id: string) => allWorkbookExercises.find((e) => e.id === id);
export const getSourceExercise = (id: string) =>
  [...sourceExercises, ...edition2026References].find((e) => e.id === id);
export const getWordForm = (id: string) => allWorkbookWords.find((w) => w.id === id);
export const getSkill = (id: string) => workbookSkills.find((s) => s.id === id);
export function contextualMeaning(form: WordForm, context = '') {
  const escaped = form.form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    form.meanings.find(
      (m) =>
        m.when === 'before-got' &&
        new RegExp(`\\b${escaped}\\s+got\\b`, 'i').test(context.replace(/[’‘]/g, "'")),
    ) || form.meanings[0]
  );
}
export function englishSegments(text: string): string[] {
  if (text.startsWith('/') && text.endsWith('/')) return [];
  return (text.replace(/\/(?:iː|e)\//g, ' ').match(/[A-Za-z][A-Za-z0-9'’ .,!?:-]*/g) || [])
    .map((s) => s.trim().replace(/^[,:\- ]+|[,:\- ]+$/g, ''))
    .filter(Boolean);
}

export const workbookEntities = entities;
const allLexemes = [...entities.lexemes, ...newEntities.lexemes].map((l) => ({
  ...l,
  wordFormIds: allWorkbookWords.filter((w) => w.lexemeId === l.id).map((w) => w.id),
}));
export const getAllWorkbookEntities = () => ({
  lexemes: allLexemes,
  pronunciations: [...entities.pronunciations, ...newEntities.pronunciations],
  meanings: [...entities.meanings, ...newEntities.meanings],
  occurrences: [...entities.occurrences, ...newEntities.occurrences],
  examples: [...entities.examples, ...newEntities.examples],
});
export const getLexeme = (id: string) => allLexemes.find((l) => l.id === id);
