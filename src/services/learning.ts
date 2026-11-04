import { lesson, lessons, getLesson, lexicon, words, byId } from '../lessons';
import type { LearningProgress, SkillProgress, Exercise } from '../types';
export const INTERVAL_DAYS = [1, 3, 7, 14];
export const emptySkill = (): SkillProgress => ({
  attempts: 0,
  correct: 0,
  errors: 0,
  hints: 0,
  lastReviewed: 0,
  level: 0,
  due: 0,
  streak: 0,
});
export const initialProgress = (lessonId = lesson.id): LearningProgress => ({
  completedRuns: 0,
  lastCompletedAt: 0,
  schemaVersion: 1,
  lessonId,
  currentExerciseId: getLesson(lessonId).exercises[0].id,
  completed: [],
  stats: {},
  reviewIds: [],
  sessions: 0,
  seconds: 0,
  hintCount: 0,
  successful: 0,
  lessonComplete: false,
  remedialCount: 0,
  remedialDone: [],
  settings: { slow: false, reduceMotion: false },
  updatedAt: Date.now(),
});
export const normalize = (s: string) =>
  s.toLowerCase().replace(/[.!?]/g, '').replace(/\s+/g, ' ').trim();
export const checkAnswer = (answer: string, expected: string) =>
  normalize(answer) === normalize(expected);
export const percent = (p: LearningProgress) =>
  Math.round((p.completed.length / getLesson(p.lessonId).exercises.length) * 100);
export const mastered = (s: SkillProgress | undefined) =>
  !!s && s.level >= 3 && s.correct >= 3 && s.streak >= 3;
export function updateSkill(
  old: SkillProgress,
  correct: boolean,
  hinted: boolean,
  now = Date.now(),
): SkillProgress {
  const streak = correct && !hinted ? old.streak + 1 : 0;
  const level = correct && !hinted ? Math.min(4, old.level + 1) : Math.max(0, old.level - 1);
  return {
    ...old,
    attempts: old.attempts + 1,
    correct: old.correct + Number(correct),
    errors: old.errors + Number(!correct),
    hints: old.hints + Number(hinted),
    lastReviewed: now,
    level,
    streak,
    due: correct ? now + INTERVAL_DAYS[Math.max(0, level - 1)] * 86400000 : now,
  };
}
export function recordAttempt(
  p: LearningProgress,
  e: Exercise,
  correct: boolean,
  hinted: boolean,
  now = Date.now(),
  chosen?: string,
): LearningProgress {
  const diagnosedSkill =
    e.type === 'sentence' && e.skillId === 'this-is' && !correct && chosen !== undefined
      ? normalize(chosen).split(' ').indexOf('my') !== normalize(e.answer).split(' ').indexOf('my')
        ? 'my-your'
        : 'this-is'
      : e.skillId;
  const ids = [...new Set([e.wordId, diagnosedSkill])];
  const stats = { ...p.stats };
  for (const id of ids) stats[id] = updateSkill(stats[id] || emptySkill(), correct, hinted, now);
  const reviewIds =
    correct && !hinted
      ? p.reviewIds.filter((id) => id !== e.wordId)
      : !correct || hinted
        ? [...new Set([...p.reviewIds, e.wordId])]
        : p.reviewIds;
  return { ...p, stats, reviewIds, successful: p.successful + Number(correct), updatedAt: now };
}
export function remedialFor(p: LearningProgress, e: Exercise, chosen: string): string | null {
  if (e.type !== 'sentence' || p.remedialCount >= 2) return null;
  const target = getLesson(p.lessonId);
  if (e.skillId !== 'this-is') {
    const rem = target.remedial.find((r) => r.available && r.id === e.skillId);
    return rem && (p.stats[e.skillId]?.errors || 0) >= 2 && !p.remedialDone.includes(rem.id)
      ? rem.id
      : null;
  }
  const errors = (p.stats['this-is']?.errors || 0) + (p.stats['my-your']?.errors || 0);
  if (errors < 2) return null;
  const tokens = normalize(chosen).split(' ');
  const wanted = normalize(e.answer).split(' ');
  const id = tokens.indexOf('my') !== wanted.indexOf('my') ? 'my-your' : 'this-is';
  return p.remedialDone.includes(id) ? null : id;
}
export function completeExercise(p: LearningProgress, e: Exercise): LearningProgress {
  const completed = [...new Set([...p.completed, e.id])];
  const target = getLesson(p.lessonId);
  if (!target.exercises.some((x) => x.id === e.id)) throw Error('Задание не принадлежит уроку');
  const next = target.exercises.find((x) => !completed.includes(x.id));
  return {
    ...p,
    completed,
    stats:
      e.type === 'study' ? { ...p.stats, [e.wordId]: p.stats[e.wordId] || emptySkill() } : p.stats,
    currentExerciseId: next?.id || null,
    lessonComplete: !next,
    completedRuns:
      (p.completedRuns ?? Number(p.lessonComplete)) + Number(!next && !p.lessonComplete),
    lastCompletedAt: !next ? Date.now() : p.lastCompletedAt || 0,
    updatedAt: Date.now(),
  };
}
export const dueWords = (p: LearningProgress, now = Date.now()) =>
  lexicon.filter((w) => p.reviewIds.includes(w.id) || (p.stats[w.id] && p.stats[w.id].due <= now));

/** Reuse choice exercises for both pictured vocabulary and grammatical words. */
export function reviewExercise(id: string): Exercise {
  const word = byId(id);
  const original = lessons
    .flatMap((l) => l.exercises)
    .find((e) => e.type === 'word' && e.wordId === id);
  if (original) return { ...original, id: 'review-' + id };
  return {
    id: 'review-' + id,
    type: 'word',
    answerMode: 'translation',
    wordId: id,
    skillId: id,
    prompt: 'Вспомни значение слова',
    answer: word.ru,
    options: [
      id,
      ...lexicon
        .filter((w) => !w.image && w.id !== id && w.ru !== word.ru)
        .slice(0, 3)
        .map((w) => w.id),
    ],
    hint: {
      translation: word.ru,
      explanation: word.explanation,
      steps: [
        'Послушай слово.',
        'Вспомни, как оно помогает в предложении.',
        'Посмотри на похожий пример.',
      ],
      example: word.example,
    },
  };
}

export function restartLesson(p: LearningProgress): LearningProgress {
  return {
    ...p,
    completed: [],
    currentExerciseId: getLesson(p.lessonId).exercises[0].id,
    lessonComplete: false,
    completedRuns: p.completedRuns ?? Number(p.lessonComplete),
    remedialCount: 0,
    remedialDone: [],
    updatedAt: Date.now(),
  };
}
export function summarize(records: Record<string, LearningProgress>) {
  const values = Object.values(records);
  const stats: Record<string, SkillProgress> = {};
  for (const p of values)
    for (const [id, s] of Object.entries(p.stats)) {
      const old = stats[id];
      stats[id] = old
        ? {
            ...(s.lastReviewed >= old.lastReviewed ? s : old),
            attempts: old.attempts + s.attempts,
            correct: old.correct + s.correct,
            errors: old.errors + s.errors,
            hints: old.hints + s.hints,
          }
        : s;
    }
  return {
    stats,
    learned: words.filter((w) => mastered(stats[w.id])).length,
    completed: values.filter((p) => (p.completedRuns ?? Number(p.lessonComplete)) > 0).length,
    runs: values.reduce((n, p) => n + (p.completedRuns ?? Number(p.lessonComplete)), 0),
    sessions: values.reduce((n, p) => n + p.sessions, 0),
    seconds: values.reduce((n, p) => n + p.seconds, 0),
    successful: values.reduce((n, p) => n + p.successful, 0),
    hintCount: values.reduce((n, p) => n + p.hintCount, 0),
  };
}

/** Parent recommendations include both recorded errors and explicit review requests. */
export function reviewWords(p: LearningProgress, includeErrors = false) {
  return includeErrors
    ? lexicon.filter((w) => p.reviewIds.includes(w.id) || (p.stats[w.id]?.errors || 0) > 0)
    : dueWords(p);
}
