import content from './practice.json';
export const TEXTBOOK_SOURCE = 'spotlight_textbook_2026_16_part1';
export interface PracticeTask {
  id: string;
  type: 'choice' | 'input' | 'order' | 'matching' | 'personal';
  prompt: string;
  text?: string;
  answer?: string;
  options?: string[];
  tokens?: string[];
  pairs?: { en: string; ru: string }[];
  fields?: string[];
  model?: string;
  why: string;
}
export interface PracticeUnit {
  id: string;
  sourceId: string;
  page: number;
  sourcePages: number[];
  sourceExercise: number | null;
  module: string;
  lesson: string;
  photoId: string;
  skill: string;
  title: string;
  explanation: string;
  authoredAdaptation: boolean;
  tasks: PracticeTask[];
}
export const practiceUnits = content as PracticeUnit[];
export const findPractice = (id: string) => practiceUnits.find((u) => u.id === id);
export type PracticeAnswer = string | Record<string, string>;
export function spokenAnswer(t: PracticeTask) {
  const text = t.text ? t.text.replace(/\.\.\./g, t.answer || '') : t.answer || '';
  return text
    .replace(/\s+([.!?,])/g, '$1')
    .replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix: string, letter: string) =>
      text.includes(' ') && /[.!?]$/.test(text.trim()) ? prefix + letter.toUpperCase() : match,
    );
}
export function normalizeAnswer(v: string) {
  return v
    .normalize('NFKC')
    .replace(/[’‘]/g, "'")
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ');
}
export function accepts(t: PracticeTask, answer: PracticeAnswer): boolean {
  if (t.type === 'matching')
    return typeof answer === 'object' && !!t.pairs?.every((p) => answer[p.en] === p.ru);
  if (t.type === 'personal')
    return (
      typeof answer === 'object' &&
      !!t.fields?.every((f) => {
        const v = answer[f]?.trim();
        return (
          v &&
          v.length <= 80 &&
          (f !== 'age' || (/^\d{1,3}$/.test(v) && Number(v) > 0 && Number(v) <= 120))
        );
      })
    );
  return typeof answer === 'string' && normalizeAnswer(answer) === normalizeAnswer(t.answer || '');
}
export interface PracticeProgress {
  sourceId: string;
  unitId: string;
  schemaVersion: 1;
  step: number;
  activeTaskIds: string[];
  mode: 'all' | 'review';
  pendingAdvance: boolean;
  completedRuns: number;
  reviewRuns: number;
  attempts: number;
  errors: number;
  hints: number;
  reviewIds: string[];
  personalAnswers: Record<string, Record<string, string>>;
  updatedAt: number;
}
export function emptyPractice(u: PracticeUnit): PracticeProgress {
  return {
    sourceId: TEXTBOOK_SOURCE,
    unitId: u.id,
    schemaVersion: 1,
    step: 0,
    activeTaskIds: u.tasks.map((t) => t.id),
    mode: 'all',
    pendingAdvance: false,
    completedRuns: 0,
    reviewRuns: 0,
    attempts: 0,
    errors: 0,
    hints: 0,
    reviewIds: [],
    personalAnswers: {},
    updatedAt: 0,
  };
}
export function validatePractice(value: unknown): PracticeProgress[] {
  if (!Array.isArray(value) || value.length > practiceUnits.length)
    throw Error('Некорректный прогресс учебника.');
  const seen = new Set<string>();
  return value.map((p: PracticeProgress) => {
    const u = p && findPractice(p.unitId);
    if (!u || seen.has(p.unitId) || p.sourceId !== TEXTBOOK_SOURCE || p.schemaVersion !== 1)
      throw Error('Неизвестный источник или занятие учебника.');
    seen.add(p.unitId);
    const ids = new Set(u.tasks.map((t) => t.id));
    const list = (v: unknown): v is string[] =>
      Array.isArray(v) && new Set(v).size === v.length && v.every((id) => ids.has(id));
    if (
      !list(p.activeTaskIds) ||
      !p.activeTaskIds.length ||
      !list(p.reviewIds) ||
      !['all', 'review'].includes(p.mode) ||
      (p.mode === 'all' && p.activeTaskIds.join() !== u.tasks.map((t) => t.id).join()) ||
      !Number.isInteger(p.step) ||
      p.step < 0 ||
      p.step > p.activeTaskIds.length ||
      typeof p.pendingAdvance !== 'boolean' ||
      (p.step === p.activeTaskIds.length && p.pendingAdvance) ||
      ['completedRuns', 'reviewRuns', 'attempts', 'errors', 'hints', 'updatedAt'].some(
        (k) =>
          !Number.isSafeInteger(p[k as keyof PracticeProgress]) ||
          Number(p[k as keyof PracticeProgress]) < 0,
      ) ||
      p.errors > p.attempts
    )
      throw Error('Повреждены ответы или счётчики учебника.');
    if (
      !p.personalAnswers ||
      typeof p.personalAnswers !== 'object' ||
      Array.isArray(p.personalAnswers)
    )
      throw Error('Повреждены личные ответы.');
    for (const [id, answer] of Object.entries(p.personalAnswers)) {
      const t = u.tasks.find((t) => t.id === id);
      if (!t || t.type !== 'personal' || !accepts(t, answer))
        throw Error('Повреждён личный ответ.');
    }
    return structuredClone(p);
  });
}
export function recordPracticeAnswer(
  p: PracticeProgress,
  u: PracticeUnit,
  taskId: string,
  answer: PracticeAnswer,
  now = Date.now(),
) {
  if (p.pendingAdvance || p.activeTaskIds[p.step] !== taskId) return p;
  const t = u.tasks.find((t) => t.id === taskId)!;
  const correct = accepts(t, answer);
  return {
    ...p,
    attempts: p.attempts + 1,
    errors: p.errors + Number(!correct),
    pendingAdvance: correct,
    updatedAt: now,
    reviewIds: correct
      ? p.mode === 'review'
        ? p.reviewIds.filter((id) => id !== taskId)
        : p.reviewIds
      : [...new Set([...p.reviewIds, taskId])],
    personalAnswers:
      t.type === 'personal' && correct
        ? { ...p.personalAnswers, [t.id]: answer as Record<string, string> }
        : p.personalAnswers,
  };
}
export function advancePractice(p: PracticeProgress, now = Date.now()): PracticeProgress {
  if (!p.pendingAdvance || p.step >= p.activeTaskIds.length) return p;
  const done = p.step + 1 === p.activeTaskIds.length;
  return {
    ...p,
    step: p.step + 1,
    pendingAdvance: false,
    updatedAt: now,
    completedRuns: p.completedRuns + Number(done && p.mode === 'all'),
    reviewRuns: p.reviewRuns + Number(done && p.mode === 'review'),
  };
}
export function restartPractice(
  p: PracticeProgress,
  u: PracticeUnit,
  review = false,
): PracticeProgress {
  if (review && !p.reviewIds.length) return p;
  return {
    ...p,
    step: 0,
    pendingAdvance: false,
    mode: review ? 'review' : 'all',
    activeTaskIds: review ? [...p.reviewIds] : u.tasks.map((t) => t.id),
    updatedAt: Date.now(),
  };
}
export const practiceCounts = {
  units: practiceUnits.length,
  pages: new Set(practiceUnits.map((u) => u.page)).size,
  sourceExercises: practiceUnits.filter((u) => u.sourceExercise !== null).length,
  steps: practiceUnits.reduce((n, u) => n + u.tasks.length, 0),
};
