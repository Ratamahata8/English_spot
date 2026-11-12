import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { practiceUnits, practiceCounts, TEXTBOOK_SOURCE, spokenAnswer } from '../src/textbook2026';
import catalogue from '../docs/textbook-2026/photo-catalog.json';
export function validateTextbookPractice() {
  const ids = new Set<string>(),
    covered = new Set<string>();
  const pages = new Map(catalogue.pages.map((p) => [p.printedPage, p]));
  const excluded = new Set(catalogue.excludedPages.map((p) => p.page));
  for (const u of practiceUnits) {
    if (
      ids.has(u.id) ||
      u.sourceId !== TEXTBOOK_SOURCE ||
      !u.authoredAdaptation ||
      !u.explanation ||
      u.tasks.length < 2 ||
      !u.skill
    )
      throw Error('Неполная адаптация ' + u.id);
    ids.add(u.id);
    for (const p of u.sourcePages) {
      const source = pages.get(p);
      if (!source || excluded.has(p)) throw Error('Нет фотографии для ' + u.id);
      if (u.sourceExercise !== null) {
        if (!source.exerciseNumbers?.includes(u.sourceExercise))
          throw Error('Не подтверждён номер ' + u.id);
        covered.add(p + ':' + u.sourceExercise);
      }
    }
    if (pages.get(u.page)?.photoId !== u.photoId)
      throw Error('Неверное доказательство страницы ' + u.id);
    for (const t of u.tasks) {
      if (ids.has(t.id) || !t.prompt || !t.why) throw Error('Неполный шаг ' + t.id);
      ids.add(t.id);
      if (['choice', 'input', 'order'].includes(t.type) && !t.answer)
        throw Error('Нет ответа ' + t.id);
      if (
        t.type === 'choice' &&
        (!t.options?.includes(t.answer!) || new Set(t.options).size !== t.options.length)
      )
        throw Error('Нет единственного варианта ' + t.id);
      if (t.type === 'order' && t.tokens?.join(' ') !== t.answer?.replace(/[.!?]+$/, ''))
        throw Error('Буквенная сборка не соответствует ответу ' + t.id);
      if (
        t.type === 'matching' &&
        (!t.pairs?.length ||
          new Set(t.pairs.map((p) => p.ru)).size !== t.pairs.length ||
          new Set(t.pairs.map((p) => p.en)).size !== t.pairs.length)
      )
        throw Error('Неоднозначные пары ' + t.id);
      if (
        t.type === 'personal' &&
        (!t.fields?.length || t.fields.some((f) => !t.model?.includes('{' + f + '}')))
      )
        throw Error('Неполный личный шаблон ' + t.id);
      if (t.answer && /[A-Za-z]/.test(t.answer) && !/[а-яё]/i.test(t.answer) && !spokenAnswer(t))
        throw Error('Нет произносимого ответа ' + t.id);
    }
  }
  const expected = catalogue.pages.flatMap((p) =>
    (p.exerciseNumbers || []).map((n) => p.printedPage + ':' + n),
  );
  if (expected.some((key) => !covered.has(key)) || covered.size !== expected.length)
    throw Error('Не покрыты номера упражнений');
  const instructional = catalogue.pages.filter(
    (p) => p.printedPage !== null && !['overview', 'frontmatter'].includes(p.kind),
  );
  if (instructional.some((p) => !practiceUnits.some((u) => u.sourcePages.includes(p.printedPage!))))
    throw Error('Не покрыты учебные страницы');
  return {
    ...practiceCounts,
    sourcePageExerciseReferences: covered.size,
    allOriginalSubitemsReproduced: false,
    mode: 'authored_interactive_adaptations',
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log('Учебник:', validateTextbookPractice());
