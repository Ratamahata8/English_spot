import entities from './data/entities.json';
import coverage from '../../content-coverage.json';
import content from './data/module-one.json';
import dictionary from './data/lexicon.json';
import registry from './data/skills.json';
import type { SourceExercise, WorkbookExercise, WordForm, Skill } from './types';
export const SOURCE_ID = 'bykova-pospelova-2017-workbook-3';
export const sourceExercises = coverage.exercises as SourceExercise[];
export const workbookExercises = content as WorkbookExercise[];
export const workbookWords = dictionary as WordForm[];
export const workbookSkills = registry as Skill[];
export const getWorkbookExercise = (id: string) => workbookExercises.find((e) => e.id === id);
export const getSourceExercise = (id: string) => sourceExercises.find((e) => e.id === id);
export const getWordForm = (id: string) => workbookWords.find((w) => w.id === id);
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
export const getLexeme = (id: string) => entities.lexemes.find((l) => l.id === id);
