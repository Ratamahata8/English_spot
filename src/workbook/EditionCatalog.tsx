import { useWorkbook } from './store';
import { PendingEdition } from './EditionControls';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { edition2026Sections, editionLabel, EDITION_2026, sectionForPage2026 } from './editions';
import {
  edition2026Exercises,
  edition2026References,
  edition2026Catalog,
  getWorkbookExercise,
} from './index';
export function EditionCatalog() {
  const { progress, initSource, ready } = useWorkbook();
  useEffect(() => {
    void initSource(EDITION_2026);
  }, [initSource]);
  const [module, setModule] = useState('all');
  const [lesson, setLesson] = useState('');
  const [page, setPage] = useState('');
  const [number, setNumber] = useState('');
  const section = page ? sectionForPage2026(Number(page)) : null;
  const filtered = edition2026Catalog.filter(
    (r) =>
      (module === 'all' || r.module === module || (module === 'intro' && r.module === 'entry')) &&
      (!page || r.printedPages?.includes(Number(page))) &&
      (!number || r.number === Number(number)) &&
      (!lesson ||
        `${r.lesson} ${getWorkbookExercise(r.adaptationIds[0])?.title}`
          .toLowerCase()
          .includes(lesson.toLowerCase())),
  );
  if (ready && progress.sourceId !== EDITION_2026) return <PendingEdition target={EDITION_2026} />;
  return (
    <>
      <section className="wb-intro panel padding">
        <span className="eyebrow">СБОРНИК · {editionLabel(EDITION_2026)}</span>
        <h1>Учимся по сборнику 2026</h1>
        <p>
          Открой страницу и номер из своей книги. Здесь можно подготовиться, потренироваться с
          подсказками и пройти задание ещё раз.
        </p>
        <p>
          Готовы вводный блок, входной тест и модули 1–8: 251 тренировка по страницам книги. В
          тренировках свои примеры; они помогают разобраться с целью задания, а не заменяют все
          подпункты печатного упражнения.
        </p>
        <div className="reader-controls">
          <Link className="button primary" to="/workbook/wb26-intro-01">
            Начать с вводного блока →
          </Link>
          <Link className="button" to="/dictionary?source=workbook">
            Словарь издания 2026 →
          </Link>
        </div>
      </section>
      <div className="reader-filters">
        <label>
          Модуль
          <select
            aria-label="Модуль сборника 2026"
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="all">Все модули</option>
            {edition2026Sections.map((s) => (
              <option key={s.id} value={s.module}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Урок / тема
          <input
            aria-label="Урок или тема"
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="Например, алфавит"
          />
        </label>
        <label>
          Печатная страница
          <input
            type="number"
            min={4}
            aria-label="Печатная страница"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="Например, 18"
          />
        </label>
        <label>
          Номер упражнения
          <input
            type="number"
            min={1}
            aria-label="Номер упражнения"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Например, 3"
          />
        </label>
      </div>
      {page && (
        <p role="status">
          {section
            ? `${editionLabel(EDITION_2026)} · ${section.title}`
            : 'Для этой страницы ещё нет тренировки.'}
        </p>
      )}
      <div className="wb-catalog">
        {edition2026Sections
          .filter((s) => module === 'all' || s.module === module)
          .map((s) => (
            <article className="panel padding" key={s.id} data-edition-section={s.id}>
              <h2>{s.title}</h2>
              <p>
                {
                  edition2026Catalog.filter(
                    (r) => r.module === s.module || (s.module === 'intro' && r.module === 'entry'),
                  ).length
                }{' '}
                упражнений готовы
              </p>
              <button
                className="button"
                onClick={() => {
                  setModule(s.module);
                  setPage('');
                  setNumber('');
                  setLesson('');
                }}
              >
                Показать модуль
              </button>
            </article>
          ))}
      </div>
      <h2>Упражнения по страницам книги</h2>
      <p>
        Это тренажёры с собственными примерами, подобранными под задачи сборника. Сначала можно
        разобрать слова и правила.
      </p>
      <div className="wb-catalog">
        {filtered.map((r) => {
          const e = getWorkbookExercise(r.adaptationIds[0])!;
          return (
            <article className="panel wb-catalog-card" key={r.id} data-source-exercise={r.id}>
              <span className="eyebrow">
                {r.module === 'intro'
                  ? 'ВВОДНЫЙ БЛОК'
                  : r.module === 'entry'
                    ? 'ВХОДНОЙ ТЕСТ'
                    : `МОДУЛЬ ${r.module} · ${r.lesson}`}
              </span>
              <h2>{e.title}</h2>
              <p>
                Стр. {r.bookPage} · № {r.number}
              </p>
              <p>{e.tasks.length} шагов · подготовка, проверка и подсказки</p>
              <Link className="button primary" to={'/workbook/' + e.id}>
                {progress.completed.includes(e.id) ? 'Пройти ещё раз →' : 'Начать тренировку →'}
              </Link>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <p role="status">
          По этому запросу ничего не найдено. Проверь страницу, номер и выбранный модуль.
        </p>
      )}
      <h2>Дополнительная практика</h2>
      <p>
        Отдельные авторские тренировки по прошедшему времени. Они не заменяют задания с конкретным
        номером из книги.
      </p>
      <div className="wb-catalog">
        {edition2026References
          .filter((r) => !number && !page && !lesson && (module === 'all' || module === r.module))
          .map((r) => {
            const e = edition2026Exercises.find((e) => e.id === r.id)!;
            return (
              <article className="panel wb-catalog-card" key={r.id} data-source={r.id}>
                <h2>{e.title}</h2>
                <p>Авторская тренировка · {e.tasks.length} шагов</p>
                <Link className="button primary" to={'/workbook/' + e.id}>
                  Начать тренировку →
                </Link>
              </article>
            );
          })}
      </div>
    </>
  );
}
