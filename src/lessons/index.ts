import school from './school.json';
import classroom from './content/classroom-actions.json';
import possession from './content/whose-toys.json';
import shared from './shared-lexicon.json';
import type { Lesson, VocabularyItem } from '../types';
import item0 from './content/numbers-one.json';
import item1 from './content/numbers-teens.json';
import item2 from './content/subjects.json';
import item3 from './content/shapes.json';
import item4 from './content/family.json';
import item5 from './content/family-description.json';
import item6 from './content/past-be.json';
import item7 from './content/food-likes.json';
import item8 from './content/lunch.json';
import item9 from './content/toys.json';
import item10 from './content/room.json';
import item11 from './content/past-actions.json';
import item12 from './content/welcome.json';
import item13 from './content/christmas.json';
export const lessons = [
  school,
  classroom,
  item0,
  item1,
  item2,
  item3,
  item4,
  item5,
  item6,
  item7,
  item8,
  item9,
  item10,
  possession,
  item11,
  item12,
  item13,
] as Lesson[];
export const lesson = lessons[0]; // Legacy default; pure learning functions use progress.lessonId.
export const DEFAULT_LESSON_ID = lesson.id;
export function getLesson(id: string): Lesson {
  const result = lessons.find((l) => l.id === id);
  if (!result) throw Error('Неизвестный урок: ' + id);
  return result;
}
function unique(items: VocabularyItem[]): VocabularyItem[] {
  return [...new Map(items.map((w) => [w.en.toLowerCase(), w])).values()];
}
export const words = unique(lessons.flatMap((l) => l.vocabulary));
export const lexicon = unique([
  ...(shared as VocabularyItem[]),
  ...lessons.flatMap((l) => l.lexicon),
  ...words,
]);
export const byId = (id: string) => {
  const word = lexicon.find((w) => w.id === id);
  if (!word) throw Error('Неизвестное слово: ' + id);
  return word;
};
export const isEnglish = (text: string) => /[a-z]/i.test(text) && !/[а-яё]/i.test(text);
export function audioTexts(): string[] {
  return [
    ...new Set(
      [
        ...lexicon.flatMap((w) => [w.en, w.example]),
        ...lessons.flatMap((l) => [
          ...l.grammar.flatMap((g) => g.examples),
          ...l.exercises.map((e) => e.answer),
          ...l.exercises.map((e) => e.hint.example),
          ...l.remedial
            .filter((r) => r.available)
            .flatMap((r) => [r.example, r.answer, ...r.options]),
        ]),
      ].filter(isEnglish),
    ),
  ];
}
