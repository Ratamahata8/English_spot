import {
  workbookWords,
  SOURCE_ID,
  workbookExercises,
  getWorkbookExercise,
  workbookSkills,
  getSkill,
  getWordForm,
} from './index';
import type { Task, Answer, WorkbookProgress, Knowledge, Attempt } from './types';
export function normalize(text: string, caseSensitive = false): string {
  const normalized = text.normalize('NFKC').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  return caseSensitive
    ? normalized
    : normalized
        .toLowerCase()
        .replace(/[.!?,]+$/, '')
        .trim();
}
export function checkTask(task: Task, answer: Answer): boolean {
  if (task.mode === 'template')
    return task.slots!.every((s, i) => s.options.includes(answer.values?.[i] || ''));
  if (task.mode === 'matching')
    return task.rows!.every((r, i) =>
      r.answers.some((a) => normalize(a) === normalize(answer.values?.[i] || '')),
    );
  if (task.mode === 'wordsearch')
    return task.placements!.every((p) => answer.found?.includes(p.word));
  if (task.mode === 'crossword')
    return task.words!.every((w, i) => normalize(w.answer) === normalize(answer.values?.[i] || ''));
  const text =
    task.mode === 'order'
      ? (answer.order || []).map((i) => task.tokens?.[i] || '').join(' | ')
      : answer.text || '';
  if (task.mode === 'order') {
    if (
      answer.order?.length !== task.tokens!.length ||
      new Set(answer.order).size !== task.tokens!.length
    )
      return false;
    // Sentence tiles are words; ordered lists and dialogue tiles are entire units.
    const wordSentence =
      task.tokens!.every((t) => !t.includes(' ')) && !task.answers![0].includes('|');
    return task.answers!.some(
      (a) => normalize(a) === normalize(wordSentence ? text.replace(/ \| /g, ' ') : text),
    );
  }
  return task.answers!.some(
    (a) => normalize(a, task.caseSensitive) === normalize(text, task.caseSensitive),
  );
}
export function findWord(task: Task, start: number[], end: number[]): string | undefined {
  const [r, c] = start,
    [rr, cc] = end;
  if (
    !task.grid ||
    r < 0 ||
    c < 0 ||
    rr < 0 ||
    cc < 0 ||
    r >= task.grid.length ||
    rr >= task.grid.length ||
    c >= task.grid[0].length ||
    cc >= task.grid[0].length
  )
    return;
  if (r !== rr && c !== cc) return;
  const dr = Math.sign(rr - r),
    dc = Math.sign(cc - c),
    length = Math.max(Math.abs(rr - r), Math.abs(cc - c)) + 1;
  const text = Array.from({ length }, (_, i) => task.grid![r + dr * i][c + dc * i])
    .join('')
    .toLowerCase();
  return task.placements?.find((p) => p.word.toLowerCase() === text)?.word;
}
export function initialWorkbook(): WorkbookProgress {
  return {
    schemaVersion: 1,
    sourceId: SOURCE_ID,
    currentId: workbookExercises[0].id,
    positions: {},
    completed: [],
    words: {},
    grammar: {},
    meaning: {},
    attempts: [],
    hintCount: 0,
    reviewIds: [],
    seconds: 0,
    preparations: {},
    updatedAt: 0,
  };
}
export function emptyKnowledge(): Knowledge {
  return { attempts: 0, independent: 0, errors: 0, hinted: 0, streak: 0, due: 0 };
}
export function evidence(
  old: Knowledge | undefined,
  correct: boolean,
  hinted: boolean,
  at = Date.now(),
): Knowledge {
  const k = { ...(old || emptyKnowledge()) };
  k.attempts++;
  if (!correct) {
    k.errors++;
    k.streak = 0;
    k.due = at;
  } else if (hinted) {
    k.hinted++;
    k.streak = 0;
    k.due = at;
  } else {
    k.independent++;
    k.streak++;
    k.due = at + [1, 3, 7, 14][Math.min(3, k.streak - 1)] * 86400000;
  }
  return k;
}
export function mastered(k?: Knowledge): boolean {
  return !!k && k.independent >= 3 && k.streak >= 3;
}
export function preparationPlan(ids: string[], progress: WorkbookProgress): string[] {
  const result: string[] = [],
    visited = new Set<string>();
  const visit = (id: string, stack: Set<string>) => {
    if (stack.has(id)) throw Error('Цикл учебных зависимостей');
    if (visited.has(id)) return;
    const s = getSkill(id);
    if (!s) throw Error('Неизвестный навык ' + id);
    const next = new Set(stack).add(id);
    s.prerequisites.forEach((p) => visit(p, next));
    visited.add(id);
    if (!s.planned && !mastered(progress.grammar[id])) result.push(id);
  };
  ids.forEach((id) => visit(id, new Set()));
  return result;
}
export function recordWorkbookAttempt(
  progress: WorkbookProgress,
  attempt: Attempt,
  answer?: Answer,
): WorkbookProgress {
  const p = structuredClone(progress);
  p.attempts.push(attempt);
  p.updatedAt = attempt.at;
  const exercise = getWorkbookExercise(attempt.exerciseId);
  for (const id of attempt.skillIds)
    p.grammar[id] = evidence(p.grammar[id], attempt.correct, attempt.hinted, attempt.at);
  if (exercise && attempt.kind === 'exercise') {
    const task = exercise.tasks[attempt.task];
    const apply = (target: string, correct: boolean) => {
      const form = workbookWords.find((w) => normalize(w.form) === normalize(target));
      if (form) p.words[form.id] = evidence(p.words[form.id], correct, attempt.hinted, attempt.at);
    };
    if (['matching', 'translation'].includes(exercise.mechanic) && task.mode === 'matching')
      task.rows!.forEach((row, i) =>
        apply(
          row.label,
          answer
            ? row.answers.some((a) => normalize(a) === normalize(answer.values?.[i] || ''))
            : attempt.correct,
        ),
      );
    if (['letters', 'anagram', 'plural'].includes(exercise.mechanic) && task.mode === 'text')
      apply(task.answers![0], attempt.correct);
    if (task.mode === 'crossword')
      task.words!.forEach((w, i) =>
        apply(
          w.answer,
          answer ? normalize(w.answer) === normalize(answer.values?.[i] || '') : attempt.correct,
        ),
      );
    if (task.mode === 'wordsearch' && attempt.correct)
      task.placements!.forEach((w) => apply(w.word, true));
    if (
      exercise.skillIds.some((s) =>
        ['sentence-meaning', 'questions', 'letter-writing', 'word-order'].includes(s),
      )
    )
      p.meaning[exercise.id] = evidence(
        p.meaning[exercise.id],
        attempt.correct,
        attempt.hinted,
        attempt.at,
      );
  }
  return p;
}
export function diagnose(task: Task, answer: Answer, skillIds: string[]): string[] {
  const diagnosis = task.diagnoses?.[answer.text || ''];
  return diagnosis ? [diagnosis] : skillIds;
}
export function validateWorkbook(value: unknown): WorkbookProgress[] {
  if (!Array.isArray(value) || value.length > 1) throw Error('Неверное сохранение сборника.');
  return value.map((raw) => {
    const p = raw as WorkbookProgress;
    if (
      !p ||
      p.schemaVersion !== 1 ||
      p.sourceId !== SOURCE_ID ||
      !getWorkbookExercise(p.currentId) ||
      !Array.isArray(p.completed) ||
      new Set(p.completed).size !== p.completed.length ||
      p.completed.some((id) => !getWorkbookExercise(id))
    )
      throw Error('Неизвестный сборник или задания.');
    if (!p.positions || typeof p.positions !== 'object' || Array.isArray(p.positions))
      throw Error('Нет позиций заданий.');
    for (const [id, index] of Object.entries(p.positions)) {
      const e = getWorkbookExercise(id);
      if (!e || !Number.isInteger(index) || index < 0 || index > e.tasks.length)
        throw Error('Неверное место остановки.');
    }
    if (p.completed.some((id) => p.positions[id] !== getWorkbookExercise(id)!.tasks.length))
      throw Error('Незавершённое задание отмечено завершённым.');
    for (const [stats, known] of [
      [p.words, (id: string) => !!getWordForm(id)],
      [p.grammar, (id: string) => workbookSkills.some((s) => s.id === id)],
      [p.meaning, (id: string) => !!getWorkbookExercise(id)],
    ] as const) {
      if (!stats || typeof stats !== 'object' || Array.isArray(stats))
        throw Error('Повреждены навыки.');
      for (const [id, k] of Object.entries(stats))
        if (
          !known(id) ||
          !k ||
          Object.values(k).some((v) => !Number.isFinite(v) || v < 0) ||
          !['attempts', 'independent', 'errors', 'hinted', 'streak', 'due'].every((key) =>
            Number.isFinite(k[key as keyof Knowledge]),
          ) ||
          k.attempts !== k.independent + k.errors + k.hinted ||
          k.streak > k.independent
        )
          throw Error('Повреждена статистика.');
    }
    if (
      !Array.isArray(p.reviewIds) ||
      new Set(p.reviewIds).size !== p.reviewIds.length ||
      p.reviewIds.some((id) => !getWordForm(id)) ||
      ![p.seconds, p.hintCount, p.updatedAt].every((n) => Number.isFinite(n) && n >= 0) ||
      !p.preparations ||
      typeof p.preparations !== 'object' ||
      Object.entries(p.preparations).some(
        ([id, n]) => !getSkill(id) || !Number.isInteger(n) || n < 0,
      )
    )
      throw Error('Повреждены отметки.');
    if (
      !Array.isArray(p.attempts) ||
      p.attempts.some(
        (a) =>
          !a ||
          !getWorkbookExercise(a.exerciseId) ||
          !Number.isInteger(a.task) ||
          a.task < 0 ||
          a.task >= getWorkbookExercise(a.exerciseId)!.tasks.length ||
          !['exercise', 'preparation', 'word-review'].includes(a.kind) ||
          typeof a.correct !== 'boolean' ||
          typeof a.hinted !== 'boolean' ||
          !Number.isFinite(a.at) ||
          a.at < 0 ||
          !Array.isArray(a.skillIds) ||
          a.skillIds.some((id) => !getSkill(id)),
      )
    )
      throw Error('Повреждены результаты.');
    return structuredClone(p);
  });
}
