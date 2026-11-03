import data from './school.json';
import type { Lesson } from '../types';
export const lesson = data as Lesson;
export const words = lesson.vocabulary;
export const lexicon = [...words, ...lesson.lexicon];
export const byId = (id: string) => lexicon.find((w) => w.id === id)!;
export function audioTexts(): string[] {
  return [
    ...new Set([
      ...lexicon.flatMap((w) => [w.en, w.example]),
      ...lesson.grammar.flatMap((g) => g.examples),
      ...lesson.exercises.map((e) => e.answer),
      ...lesson.remedial
        .filter((r) => r.available)
        .flatMap((r) => [r.example, r.answer, ...r.options]),
    ]),
  ];
}
