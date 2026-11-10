import restContent from './data/edition-2026-rest.json';
import restCatalog from './data/edition-2026-rest-catalog.json';
import restSkills from './data/edition-2026-rest-skills.json';
import videoContent from './data/edition-2026-intro-module-one.json';
import videoCatalog from './data/edition-2026-catalog.json';
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
export const edition2026SourceExercises = videoContent as WorkbookExercise[];
export const edition2026RestExercises = restContent as WorkbookExercise[];
export const edition2026Catalog = [...videoCatalog, ...restCatalog] as SourceExercise[];
export const all2026Exercises = [
  ...edition2026SourceExercises,
  ...edition2026RestExercises,
  ...edition2026Exercises,
];
export const allWorkbookWords = [
  ...new Map([...workbookWords, ...edition2026Words].map((w) => [w.id, w])).values(),
].map((w) => ({
  ...w,
  occurrences: [
    ...(workbookWords.find((old) => old.id === w.id)?.occurrences || []),
    ...(edition2026Words.find((modern) => modern.id === w.id)?.occurrences || []),
  ],
}));
export const allWorkbookExercises = [...workbookExercises, ...all2026Exercises];
export const exercisesForEdition = (id: string) =>
  id === EDITION_2026 ? all2026Exercises : workbookExercises;
export const wordsForEdition = (id: string) =>
  id === EDITION_2026 ? edition2026Words : workbookWords;
export const workbookSkills = [...registry, ...newSkills, ...restSkills] as Skill[];
export const getWorkbookExercise = (id: string) => allWorkbookExercises.find((e) => e.id === id);
export const getSourceExercise = (id: string) =>
  [...sourceExercises, ...edition2026Catalog, ...edition2026References].find(
    (e) => e.id === id || e.adaptationIds.includes(id),
  );
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
const allLexemes = [
  ...new Map([...entities.lexemes, ...newEntities.lexemes].map((l) => [l.id, l])).values(),
].map((l) => ({
  ...l,
  wordFormIds: allWorkbookWords.filter((w) => w.lexemeId === l.id).map((w) => w.id),
}));
export const getAllWorkbookEntities = () => ({
  lexemes: allLexemes,
  pronunciations: [
    ...new Map(
      [...entities.pronunciations, ...newEntities.pronunciations].map((item) => [item.id, item]),
    ).values(),
  ],
  meanings: [
    ...new Map(
      [...entities.meanings, ...newEntities.meanings].map((item) => [item.id, item]),
    ).values(),
  ],
  occurrences: [...entities.occurrences, ...newEntities.occurrences],
  examples: [
    ...new Map(
      [...entities.examples, ...newEntities.examples].map((item) => [item.id, item]),
    ).values(),
  ],
});
export const getLexeme = (id: string) => allLexemes.find((l) => l.id === id);
