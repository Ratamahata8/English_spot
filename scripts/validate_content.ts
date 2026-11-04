import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { lessons, lexicon, audioTexts, byId } from '../src/lessons';
export function validateContent() {
  const errors: string[] = [];
  const ids = new Set<string>();
  const wordIds = new Set(lexicon.map((w) => w.id));
  for (const w of lexicon) {
    if (!w.ru || !w.ipa || !w.example) errors.push(`Неполное слово ${w.id}`);
    if (w.image && !existsSync(resolve('public', w.image))) errors.push(`Нет изображения ${w.id}`);
  }
  const known = new Set(lexicon.flatMap((w) => w.en.toLowerCase().split(' ')));
  for (const l of lessons) {
    if (ids.has(l.id)) errors.push(`Повтор урока ${l.id}`);
    ids.add(l.id);
    if (l.vocabulary.length < 4) errors.push(`Слишком мало слов ${l.id}`);
    if (!wordIds.has(l.coverWordId) || !l.module || !l.description)
      errors.push(`Нет метаданных ${l.id}`);
    if (l.id === 'school-1a' && l.vocabulary.length !== 8)
      errors.push('Первый урок должен содержать 8 слов');
    for (const w of l.vocabulary) if (!w.image) errors.push(`Нет картинки ${w.id}`);
    for (const e of l.exercises) {
      if (ids.has(e.id)) errors.push(`Повтор задания ${e.id}`);
      ids.add(e.id);
      if (!l.vocabulary.some((w) => w.id === e.wordId))
        errors.push(`Нет слова ${e.wordId} в ${l.id}`);
      if (!e.answer || !e.hint.steps.length || !e.hint.example || !e.hint.translation)
        errors.push(`Нет ответа/подсказки ${e.id}`);
      for (const id of e.options) if (!wordIds.has(id)) errors.push(`Нет варианта ${id}`);
      if (
        (e.type === 'word' || e.type === 'picture') &&
        !e.options.some((id) => byId(id).en === e.answer)
      )
        errors.push(`Нет правильного варианта ${e.id}`);
      if (e.options.length && new Set(e.options).size !== e.options.length)
        errors.push(`Повтор вариантов ${e.id}`);
    }
    for (const type of ['study', 'picture', 'word', 'letters', 'sentence'])
      if (!l.exercises.some((e) => e.type === type)) errors.push(`Нет механики ${type} в ${l.id}`);
  }
  for (const phrase of audioTexts())
    for (const token of phrase.toLowerCase().replace(/[.!?]/g, '').split(/\s+/))
      if (token && !known.has(token)) errors.push(`Нет словарной подсказки ${token} в ${phrase}`);
  if (errors.length) throw Error([...new Set(errors)].join('\n'));
  return {
    lessons: lessons.length,
    exercises: lessons.reduce((n, l) => n + l.exercises.length, 0),
    words: new Set(lessons.flatMap((l) => l.vocabulary.map((w) => w.id))).size,
    audioTexts: audioTexts().length,
  };
}
if (process.argv[1]?.endsWith('validate_content.ts'))
  console.log('Контент проверен:', validateContent());
