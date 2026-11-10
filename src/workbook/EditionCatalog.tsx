import { useWorkbook } from './store';
import { PendingEdition } from './EditionControls';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { edition2026Sections, editionLabel, EDITION_2026, sectionForPage2026 } from './editions';
import { edition2026Exercises, edition2026References } from './index';
export function EditionCatalog() {
  const { progress, initSource, ready } = useWorkbook();
  useEffect(() => {
    void initSource(EDITION_2026);
  }, [initSource]);
  const [module, setModule] = useState('all'),
    [lesson, setLesson] = useState(''),
    [page, setPage] = useState(''),
    [number, setNumber] = useState('');
  const section = page ? sectionForPage2026(Number(page)) : null;
  const filtered = edition2026References.filter(
    (r) =>
      (module === 'all' || r.module === module) &&
      (!page || r.printedPages?.includes(Number(page))) &&
      (!lesson ||
        `${r.lesson} ${edition2026Exercises.find((e) => e.id === r.id)?.title}`
          .toLowerCase()
          .includes(lesson.toLowerCase())) &&
      !number,
  );
  const sections = edition2026Sections.filter(
    (s) => (module === 'all' || s.module === module) && (!page || s === section),
  );
  if (ready && progress.sourceId !== EDITION_2026) return <PendingEdition target={EDITION_2026} />;
  return (
    <>
      <section className="wb-intro panel padding">
        <span className="eyebrow">СБОРНИК · {editionLabel(EDITION_2026)}</span>
        <h1>Учимся по сборнику 2026</h1>
        <p>
          Найди свой модуль или страницу. Пока точно известны начала модулей и две новые
          грамматические темы. Номера отдельных упражнений ещё сверяются.
        </p>
        <p>Старые результаты сохранены в издании 2017. Они не засчитываются за новые задания.</p>
        <Link className="button" to="/dictionary?source=workbook">
          Словарь издания 2026 →
        </Link>
        <div className="reader-controls">
          <Link className="button primary" to="/workbook/wb26-past-question">
            Did / didn't →
          </Link>
          <Link className="button primary" to="/workbook/wb26-there-past">
            There was / there were →
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
            placeholder="Например, past-simple"
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
            placeholder="Например, 82"
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
            placeholder="Нужна сверка"
          />
        </label>
      </div>
      {page && (
        <p role="status">
          {section
            ? `${editionLabel(EDITION_2026)} · ${section.title}`
            : 'Эта страница не подтверждена оглавлением.'}
          {Number(page) > 141
            ? ' Последняя страница сборника не установлена; наличие этой страницы не подтверждено.'
            : ''}
        </p>
      )}
      {number && (
        <p role="status">
          Точный номер упражнения {number} в издании 2026 ещё не проверен. Не подставляем задание из
          старого издания.
        </p>
      )}
      <div className="wb-catalog">
        {sections.map((s) => (
          <article className="panel padding" key={s.id} data-edition-section={s.id}>
            <h2>{s.title}</h2>
            <p>
              {editionLabel(EDITION_2026)} ·{' '}
              {s.end ? `стр. ${s.start}–${s.end - 1}` : `с ${s.start}; конец не подтверждён`}
            </p>
            <small>
              Начало подтверждено оглавлением из пользовательского отчёта. Соответствие отдельных
              упражнений: unverified.
            </small>
          </article>
        ))}
      </div>
      <h2>Тренировки по подтверждённым темам</h2>
      <p>
        Собственные примеры приложения. Диапазон страниц подтверждён отчётом; точный номер исходного
        упражнения не установлен.
      </p>
      <div className="wb-catalog">
        {filtered.map((r) => {
          const e = edition2026Exercises.find((e) => e.id === r.id)!;
          return (
            <article className="panel wb-catalog-card" key={r.id} data-source={r.id}>
              <span className="eyebrow">
                {editionLabel(EDITION_2026)} · МОДУЛЬ {r.module}
              </span>
              <h2>{e.title}</h2>
              <p>Стр. {r.printedPages?.join('–')} · номер упражнения не проверен</p>
              <p>Авторская тренировка · {e.tasks.length} шагов</p>
              <Link className="button primary" to={'/workbook/' + r.id}>
                Начать тренировку →
              </Link>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <p role="status">Подтверждённых тренировок по такому запросу пока нет.</p>
      )}
    </>
  );
}
