import { describe, it, expect } from 'vitest';
import { lesson, lessons, words } from '../src/lessons';
import {
  checkAnswer,
  initialProgress,
  recordAttempt,
  completeExercise,
  percent,
  updateSkill,
  emptySkill,
  remedialFor,
  dueWords,
  mastered,
  INTERVAL_DAYS,
  reviewExercise,
} from '../src/services/learning';
import { validateContent } from '../scripts/validate_content';
import { validateImport } from '../src/services/storage';
const word = lesson.exercises.find((e) => e.type === 'word')!;
const sentence = lesson.exercises.find((e) => e.type === 'sentence')!;
describe('учебная логика', () => {
  it('сравнивает смысловой ответ, сохраняя порядок букв и слов', () => {
    expect(checkAnswer('  This  is MY book.', 'This is my book.')).toBe(true);
    expect(checkAnswer('my is this book', 'This is my book.')).toBe(false);
    expect(checkAnswer('schoolbag', 'school bag')).toBe(false);
  });
  it('сохраняет стабильный ID и завершает урок без дублей', () => {
    let p = initialProgress();
    p = completeExercise(p, lesson.exercises[0]);
    p = completeExercise(p, lesson.exercises[0]);
    expect(p.completed).toHaveLength(1);
    expect(p.currentExerciseId).toBe(lesson.exercises[1].id);
    for (const e of lesson.exercises) p = completeExercise(p, e);
    expect(percent(p)).toBe(100);
    expect(p.currentExerciseId).toBeNull();
    expect(p.lessonComplete).toBe(true);
  });
  it('ошибка создаёт повторение в текущем занятии', () => {
    const p = recordAttempt(initialProgress(), word, false, false, 100);
    expect(p.stats[word.wordId].errors).toBe(1);
    expect(p.reviewIds).toContain(word.wordId);
    expect(dueWords(p, 100).map((w) => w.id)).toContain(word.wordId);
  });
  it('интервалы: 1, 3, 7, 14 дней; подсказка не даёт мгновенное освоение', () => {
    let s = emptySkill();
    for (const days of INTERVAL_DAYS) {
      s = updateSkill(s, true, false, 100);
      expect(s.due).toBe(100 + days * 86400000);
    }
    expect(mastered(updateSkill(emptySkill(), true, false))).toBe(false);
    expect(updateSkill(s, true, true).streak).toBe(0);
  });
  it('считает ошибки, подсказки и правильные ответы отдельно', () => {
    let p = recordAttempt(initialProgress(), word, false, true);
    p = recordAttempt(p, word, true, false);
    expect(p.stats[word.wordId]).toMatchObject({ attempts: 2, correct: 1, errors: 1, hints: 1 });
    expect(p.successful).toBe(1);
  });
  it('после двух ошибок предлагает подходящий мини-урок и ограничивает вмешательства', () => {
    let p = initialProgress();
    expect(remedialFor(p, sentence, 'my This is book')).toBeNull();
    p = recordAttempt(recordAttempt(p, sentence, false, false), sentence, false, false);
    expect(remedialFor(p, sentence, 'my This is book')).toBe('my-your');
    expect(remedialFor(p, sentence, 'is This my book')).toBe('this-is');
    expect(remedialFor({ ...p, remedialCount: 2 }, sentence, 'my This is book')).toBeNull();
    expect(
      remedialFor({ ...p, remedialDone: ['my-your'] }, sentence, 'my This is book'),
    ).toBeNull();
  });
  it('проверяет целостность контента и наличие всех иллюстраций', () => {
    expect(validateContent()).toMatchObject({
      lessons: lessons.length,
      words: words.length,
      exercises: lessons.reduce((n, l) => n + l.exercises.length, 0),
    });
  });
  it('проверяет импорт и отказывает повреждённым/чужим данным', () => {
    const p = initialProgress();
    expect(validateImport(JSON.parse(JSON.stringify(p)))).toEqual(p);
    for (const bad of [
      { ...p, schemaVersion: 2 },
      { ...p, completed: ['unknown'] },
      { ...p, stats: { school: { attempts: -1 } } },
      { ...p, reviewIds: ['alien'] },
      { ...p, currentExerciseId: null },
    ])
      expect(() => validateImport(bad)).toThrow();
  });
});

it('служебные слова из подсказок тоже можно повторять и сохранять', () => {
  const e = reviewExercise('lex-my');
  expect(e.answerMode).toBe('translation');
  expect(e.options).toContain('lex-my');
  let p = initialProgress();
  p = { ...p, reviewIds: ['lex-my'] };
  expect(dueWords(p).map((w) => w.id)).toContain('lex-my');
  p = recordAttempt(p, e, true, false);
  expect(p.reviewIds).not.toContain('lex-my');
  expect(validateImport(p).stats['lex-my'].correct).toBe(1);
});

it('разделяет ошибки порядка слов и принадлежности в родительской статистике', () => {
  const p = recordAttempt(initialProgress(), sentence, false, false, 100, 'my This is school bag');
  expect(p.stats['my-your'].errors).toBe(1);
  expect(p.stats['this-is']).toBeUndefined();
});
