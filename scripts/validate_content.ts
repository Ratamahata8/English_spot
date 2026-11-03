import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lesson, lexicon, audioTexts } from '../src/lessons';
import type { AudioAsset } from '../src/types';
export function validateContent() {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const entity of [...lesson.vocabulary, ...lesson.lexicon, ...lesson.exercises]) {
    if (!entity.id || ids.has(entity.id)) errors.push(`Повтор ID: ${entity.id}`);
    ids.add(entity.id);
  }
  if (lesson.vocabulary.length !== 8) errors.push('Первый урок должен содержать 8 слов');
  for (const w of lesson.vocabulary) {
    if (!w.ru || !w.ipa || !w.example || !existsSync(resolve('public', w.image)))
      errors.push(`Неполное слово: ${w.id}`);
  }
  for (const e of lesson.exercises) {
    if (!lesson.vocabulary.some((w) => w.id === e.wordId)) errors.push(`Нет слова ${e.wordId}`);
    if (!e.answer || !e.hint.steps.length || !e.hint.example)
      errors.push(`Нет ответа/подсказки ${e.id}`);
    for (const id of e.options)
      if (!lesson.vocabulary.some((w) => w.id === id)) errors.push(`Нет варианта ${id}`);
    if (
      (e.type === 'word' || e.type === 'picture') &&
      !e.options.some((id) => lesson.vocabulary.find((w) => w.id === id)?.en === e.answer)
    )
      errors.push(`Нет правильного варианта ${e.id}`);
  }
  for (const type of ['study', 'picture', 'word', 'letters', 'sentence'])
    if (!lesson.exercises.some((e) => e.type === type)) errors.push(`Нет механики ${type}`);
  const phrases = [
    ...lesson.exercises.map((e) => e.answer),
    ...lexicon.map((w) => w.example),
    ...lesson.grammar.flatMap((g) => g.examples),
    ...lesson.remedial
      .filter((r) => r.available)
      .flatMap((r) => [r.example, r.answer, ...r.options]),
  ];
  for (const phrase of phrases) {
    const reduced = phrase.toLowerCase().replace(/[.!?]/g, '').split(/\s+/);
    const known = new Set(lexicon.flatMap((w) => w.en.toLowerCase().split(' ')));
    for (const t of reduced)
      if (t && !known.has(t)) errors.push(`Нет словарной подсказки для ${t} в ${phrase}`);
  }
  if (errors.length) throw Error(errors.join('\n'));
  return {
    exercises: lesson.exercises.length,
    words: lesson.vocabulary.length,
    audioTexts: audioTexts().length,
  };
}
if (process.argv[1]?.endsWith('validate_content.ts'))
  console.log('Контент проверен:', validateContent());
