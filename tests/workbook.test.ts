import 'fake-indexeddb/auto';
import { it, expect } from 'vitest';
import Dexie from 'dexie';
import { validateWorkbookContent } from '../scripts/validate_workbook';
import {
  sourceExercises,
  workbookExercises,
  workbookWords,
  workbookSkills,
  getSkill,
  contextualMeaning,
  englishSegments,
} from '../src/workbook';
import {
  checkTask,
  findWord,
  initialWorkbook,
  preparationPlan,
  recordWorkbookAttempt,
  mastered,
  validateWorkbook,
  evidence,
  normalize,
} from '../src/workbook/learning';
import {
  IndexedDBProgressRepository,
  createWorkbookRepository,
  createReaderRepository,
  validateBundle,
} from '../src/services/storage';
import { initialProgress } from '../src/services/learning';
import { emptyReader, scenes } from '../src/textbook';
import type { Answer, Task } from '../src/workbook/types';
it('313 упражнений источника, 33 авторские адаптации и независимая проверка готовности', () => {
  expect(validateWorkbookContent()).toMatchObject({
    sourceExercises: 313,
    adapted: 33,
    tasks: 110,
    forms: 173,
    lexemes: 144,
  });
  for (const module of ['revision', 'entry', '1', '2', '3', '4', '5', '6', '7', '8'])
    expect(sourceExercises.some((e) => e.module === module)).toBe(true);
  expect(sourceExercises.filter((e) => e.status === 'not_started')).toHaveLength(280);
});
it('проверяет разные типы ответов, повторы частей, многовариантные ответы и регистр', () => {
  const text: Task = {
    mode: 'text',
    prompt: '',
    answers: ['It is my book.', "It's my book."],
    why: '',
  };
  expect(checkTask(text, { text: '  it IS my book! ' })).toBe(true);
  expect(checkTask(text, { text: 'It is book my.' })).toBe(false);
  expect(checkTask({ ...text, caseSensitive: true }, { text: 'it is my book.' })).toBe(false);
  const order: Task = {
    mode: 'order',
    prompt: '',
    why: '',
    tokens: ['I', 'am', 'I'],
    answers: ['I | I | am'],
  };
  expect(checkTask(order, { order: [0, 2, 1] })).toBe(true);
  expect(checkTask(order, { order: [0, 0, 1] })).toBe(false);
  const table: Task = {
    mode: 'matching',
    prompt: '',
    why: '',
    options: ['sing', 'listen', 'run'],
    rows: [{ label: 'Music', answers: ['sing', 'listen'] }],
  };
  expect(checkTask(table, { values: ['listen'] })).toBe(true);
  expect(checkTask(table, { values: ['run'] })).toBe(false);
  const letter: Task = {
    mode: 'template',
    prompt: '',
    why: '',
    slots: [{ label: 'Вкус', options: ['I like Art.', 'I like Music.'] }],
  };
  expect(checkTask(letter, { values: ['I like Art.'] })).toBe(true);
  expect(checkTask(letter, { values: ['I like Music.'] })).toBe(true);
  expect(checkTask(letter, {})).toBe(false);
});
it('каждая найденная строка сетки и все пересечения кроссворда проверяемы', () => {
  const task = workbookExercises.flatMap((e) => e.tasks).find((t) => t.mode === 'wordsearch')!;
  for (const p of task.placements!) expect(findWord(task, p.start, p.end)).toBe(p.word);
  expect(findWord(task, [0, 0], [-1, 0])).toBeUndefined();
  expect(findWord(task, [0, 0], [1, 1])).toBeUndefined();
  const crossword = workbookExercises.flatMap((e) => e.tasks).find((t) => t.mode === 'crossword')!;
  expect(checkTask(crossword, { values: crossword.words!.map((w) => w.answer) })).toBe(true);
  expect(
    checkTask(crossword, {
      values: crossword.words!.map((w, i) => (i === 0 ? 'wrong' : w.answer)),
    }),
  ).toBe(false);
});
it('подготовка обходит зависимости, пропускает освоенное и обнаруживает цикл', () => {
  const p = initialWorkbook(),
    plan = preparationPlan(['be'], p);
  expect(plan.indexOf('pronouns')).toBeLessThan(plan.indexOf('be'));
  expect(plan.indexOf('vocabulary')).toBeLessThan(plan.indexOf('pronouns'));
  const skill = getSkill('be')!;
  expect(getSkill('continuous')!.prerequisites).toEqual(
    expect.arrayContaining(['pronouns', 'be', 'actions', 'ing', 'word-order']),
  );
  p.grammar.pronouns = { attempts: 3, independent: 3, errors: 0, hinted: 0, streak: 3, due: 1 };
  expect(preparationPlan(['be'], p)).not.toContain('pronouns');
  skill.prerequisites.push('be');
  try {
    expect(() => preparationPlan(['be'], p)).toThrow('Цикл');
  } finally {
    skill.prerequisites.pop();
  }
});
it('ошибки и ответы с помощью не создают фиктивное освоение', () => {
  const ex = workbookExercises.find((e) => e.id === 'wb-1-1a-1b-2')!,
    word = workbookWords.find((w) => w.form === ex.tasks[0].answers![0])!;
  let p = initialWorkbook();
  for (let i = 0; i < 5; i++)
    p = recordWorkbookAttempt(p, {
      exerciseId: ex.id,
      task: 0,
      correct: true,
      hinted: true,
      at: i + 1,
      kind: 'exercise',
      skillIds: ['spelling'],
    });
  expect(mastered(p.words[word.id])).toBe(false);
  expect(p.words[word.id].hinted).toBe(5);
  for (let i = 0; i < 3; i++)
    p = recordWorkbookAttempt(p, {
      exerciseId: ex.id,
      task: 0,
      correct: true,
      hinted: false,
      at: i + 10,
      kind: 'exercise',
      skillIds: ['spelling'],
    });
  expect(mastered(p.words[word.id])).toBe(true);
  expect(Object.keys(p.words)).toEqual([word.id]);
  p = recordWorkbookAttempt(p, {
    exerciseId: ex.id,
    task: 0,
    correct: false,
    hinted: false,
    at: 20,
    kind: 'exercise',
    skillIds: ['spelling'],
  });
  expect(mastered(p.words[word.id])).toBe(false);
  expect(p.words[word.id].due).toBe(20);
  const before = structuredClone(p.words);
  p = recordWorkbookAttempt(p, {
    exerciseId: 'wb-1-2a-2b-5',
    task: 0,
    correct: true,
    hinted: false,
    at: 21,
    kind: 'exercise',
    skillIds: ['be'],
  });
  expect(p.words).toEqual(before);
});
it('ошибка в одной паре не приписывается правильно решённым словам', () => {
  const ex = workbookExercises[0],
    t = ex.tasks[0],
    answer: Answer = { values: t.rows!.map((r) => r.answers[0]) };
  answer.values![0] = t.rows![1].answers[0];
  const p = recordWorkbookAttempt(
    initialWorkbook(),
    {
      exerciseId: ex.id,
      task: 0,
      correct: false,
      hinted: false,
      at: 1,
      skillIds: ['vocabulary'],
      kind: 'exercise',
    },
    answer,
  );
  const first = workbookWords.find((w) => w.form === t.rows![0].label)!,
    second = workbookWords.find((w) => w.form === t.rows![1].label)!;
  expect(p.words[first.id].errors).toBe(1);
  expect(p.words[second.id].errors).toBe(0);
  expect(p.words[second.id].independent).toBe(1);
});
it('сокращение she’s получает контекстное значение; производные не добавляются автоматически', () => {
  const she = workbookWords.find((w) => w.form === "she's")!;
  expect(contextualMeaning(she, "She's at school.").ru).toContain('she is');
  expect(contextualMeaning(she, "She's got a book.").ru).toContain('has');
  expect(workbookWords.some((w) => w.form === 'having')).toBe(false);
  expect(workbookWords.filter((w) => w.lemma === 'film').map((w) => w.form)).toEqual(['films']);
  expect(englishSegments('Ответ: I am happy.')).toEqual(['I am happy.']);
});
it('Dexie v3 → v4 сохраняет уроки и комикс; старые импорты не удаляют сборник', async () => {
  const name = 'workbook-v3';
  const old = new Dexie(name);
  old.version(3).stores({ progress: 'lessonId', preferences: 'key', reader: 'sceneId' });
  const lesson = initialProgress(),
    reader = emptyReader(scenes[0]);
  await old.table('progress').put(lesson);
  await old.table('reader').put(reader);
  old.close();
  const repo = new IndexedDBProgressRepository(name),
    book = createWorkbookRepository(name);
  expect(await repo.load()).toEqual(lesson);
  expect(await createReaderRepository(name).loadAll()).toEqual([reader]);
  const p = initialWorkbook();
  p.positions[p.currentId] = 1;
  await book.save(p);
  expect(await createWorkbookRepository(name).loadAll()).toEqual([p]);
  const legacy = {
    schemaVersion: 2 as const,
    selectedLessonId: lesson.lessonId,
    lessons: [lesson],
  };
  await repo.replaceAll(legacy);
  expect(await book.loadAll()).toEqual([p]);
  const backup = validateBundle({ ...legacy, reader: [reader], workbook: [p] });
  await repo.replaceAll({ ...backup, workbook: [] });
  expect(await book.loadAll()).toEqual([]);
  await repo.replaceAll(backup);
  expect(await book.loadAll()).toEqual([p]);
  await repo.resetAll();
  expect(await book.loadAll()).toEqual([]);
});
it('импорт отвергает поддельные навыки и невозможные позиции без удаления данных', () => {
  const p = initialWorkbook();
  expect(() => validateWorkbook([{ ...p, positions: { [p.currentId]: 999 } }])).toThrow();
  expect(() =>
    validateWorkbook([{ ...p, words: { fake: evidence(undefined, true, false) } }]),
  ).toThrow();
  expect(() => validateWorkbook([p, p])).toThrow();
  expect(() => validateWorkbook([{ ...p, attempts: [{ exerciseId: 'fake' }] }])).toThrow();
  expect(() => validateWorkbook([{ ...p, completed: [p.currentId] }])).toThrow();
});
