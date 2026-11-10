import { EditionSelector, PendingEdition } from '../workbook/EditionControls';
import { editionFromQuery, editionLabel, EDITION_2026 } from '../workbook/editions';
import { useProgress } from '../stores/progress';
import { useEffect, useState, useRef } from 'react';
import { HintToggle } from '../components/Hints';
import { Link, useSearchParams } from 'react-router-dom';
import {
  wordsForEdition,
  allWorkbookWords,
  workbookExercises,
  getWordForm,
  getSourceExercise,
  contextualMeaning,
  getLexeme,
} from '../workbook';
import { useWorkbook } from '../workbook/store';
import {
  WorkbookIllustration,
  WorkbookText,
  WorkbookAudio,
  FormReviewButton,
} from '../workbook/components';
import { mastered, evidence, recordWorkbookAttempt } from '../workbook/learning';
export function WorkbookDictionary() {
  const slow = useProgress((s) => s.progress.settings.slow),
    updateSettings = useProgress((s) => s.update);
  const [params] = useSearchParams();
  const edition = params.has('edition')
    ? editionFromQuery(params.get('edition'))
    : getWordForm(params.get('form') || '')?.occurrences[0]?.sourceId || EDITION_2026;
  const workbookWords = wordsForEdition(edition);
  const { progress, initSource, update, error, ready } = useWorkbook();
  useEffect(() => {
    void initSource(edition);
  }, [initSource, edition]);
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState(''),
    [showForms, setShowForms] = useState(false),
    [module, setModule] = useState('all'),
    [pos, setPos] = useState('all'),
    [state, setState] = useState('all'),
    [review, setReview] = useState(false),
    [answer, setAnswer] = useState(''),
    [result, setResult] = useState<boolean | null>(null),
    [reviewIndex, setReviewIndex] = useState(0),
    [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const reviewHintBaseline = useRef(progress.hintCount);
  const requested = params.get('form'),
    lexeme = requested && getWordForm(requested)?.lexemeId;
  const allGroups = [...new Set(workbookWords.map((w) => w.lexemeId))].map((id) =>
    workbookWords.filter((w) => w.lexemeId === id),
  );
  const status = (id: string) => {
    const k = progress.words[id];
    return progress.reviewIds.includes(id) || (!!k && k.due <= Date.now())
      ? 'review'
      : mastered(k)
        ? 'mastered'
        : k?.attempts
          ? 'learning'
          : 'new';
  };
  const matching = workbookWords.filter(
    (w) =>
      (!lexeme || w.lexemeId === lexeme) &&
      `${w.form} ${w.lemma} ${w.meanings.map((m) => m.ru).join(' ')}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()) &&
      (module === 'all' ||
        w.occurrences.some((o) => getSourceExercise(o.exerciseId)?.module === module)) &&
      (pos === 'all' || w.partOfSpeech === pos) &&
      (state === 'all' || status(w.id) === state),
  );
  const groups = showForms
    ? matching.map((w) => [w])
    : allGroups
        .map((g) => g.filter((w) => matching.some((m) => m.id === w.id)))
        .filter((g) => g.length > 0);
  const pageSize = 36;
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const visibleGroups = groups.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  useEffect(() => {
    setPageIndex(0);
  }, [edition, search, showForms, module, pos, state, requested]);
  const reviewWords = allWorkbookWords.filter(
    (w) =>
      progress.reviewIds.includes(w.id) ||
      (!!progress.words[w.id] && progress.words[w.id].due <= Date.now()),
  );
  const current = getWordForm(reviewQueue[reviewIndex]);
  async function checkReview() {
    if (!current || result === true) return;
    const correct = answer === current.meanings[0].ru;
    const assisted = progress.hintCount > reviewHintBaseline.current;
    setResult(correct);
    await update((p) => {
      const next = recordWorkbookAttempt(p, {
        exerciseId: p.currentId,
        task: 0,
        correct,
        hinted: assisted,
        at: Date.now(),
        skillIds: ['vocabulary'],
        kind: 'word-review',
      });
      next.words[current.id] = evidence(p.words[current.id], correct, assisted);
      if (correct && !assisted) next.reviewIds = next.reviewIds.filter((id) => id !== current.id);
      return next;
    });
  }
  if (!ready) return <p role="status">Открываем словарь…</p>;
  if (progress.sourceId !== edition) return <PendingEdition target={edition} />;
  return (
    <>
      <EditionSelector edition={edition} />
      <div className="wb-dictionary-notice">
        <h2>Лексика из сборника · {editionLabel(edition)}</h2>
        <p>
          Публикуем только проверенные употребления. Сейчас — {workbookWords.length} форм и{' '}
          {[...new Set(workbookWords.map((w) => w.lexemeId))].length} основных статей. Полный
          словарь всех восьми модулей ещё сверяется: 100% покрытия не заявлено.
          {edition === EDITION_2026 &&
            ' Большинство употреблений проверено по видео с указанием страницы и номера; для отдельных форм сохранены данные прежнего отчёта. Слова собственных примеров не выдаются за лексику редакции 2026.'}
        </p>
      </div>
      {error && (
        <div role="alert">
          {error}
          <button className="button" onClick={() => void useWorkbook.getState().retry()}>
            Повторить сохранение
          </button>
        </div>
      )}
      <div className="reader-controls">
        <HintToggle />
        <label className="setting">
          <input
            type="checkbox"
            checked={slow}
            onChange={(e) =>
              void updateSettings((p) => ({
                ...p,
                settings: { ...p.settings, slow: e.target.checked },
              }))
            }
          />{' '}
          Медленно 0.75×
        </label>
      </div>
      <div className="reader-filters">
        <label>
          Слово или перевод
          <input
            aria-label="Слово сборника или перевод"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Например, книги или books"
          />
        </label>
        <label>
          Вид
          <select
            aria-label="Вид словаря"
            value={showForms ? 'forms' : 'lemmas'}
            onChange={(e) => setShowForms(e.target.value === 'forms')}
          >
            <option value="lemmas">Основные слова</option>
            <option value="forms">Все словоформы</option>
          </select>
        </label>
        <label>
          Модуль
          <select
            aria-label="Модуль словаря сборника"
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="all">Все модули</option>
            {edition === EDITION_2026 ? (
              <>
                <option value="intro">Вводный блок</option>
                <option value="entry">Входной тест</option>
              </>
            ) : (
              <option value="revision">Повторение</option>
            )}
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i} value={String(i + 1)}>
                Модуль {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Часть речи
          <select aria-label="Часть речи" value={pos} onChange={(e) => setPos(e.target.value)}>
            <option value="all">Все части речи</option>
            {[...new Set(workbookWords.map((w) => w.partOfSpeech))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Изучение
          <select
            aria-label="Изучение слов сборника"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="all">Все слова</option>
            <option value="new">Не изучены</option>
            <option value="learning">Изучаются</option>
            <option value="mastered">Выучены</option>
            <option value="review">Нужно повторить</option>
          </select>
        </label>
      </div>
      {lexeme && (
        <Link className="button" to={'/dictionary?source=workbook&edition=' + edition}>
          Показать весь словарь сборника
        </Link>
      )}
      {reviewWords.some((w) => !workbookWords.some((active) => active.id === w.id)) && (
        <p>
          В очереди также есть слова из другого издания, сохранённые в тренировках. У каждого слова
          указан его источник; это не подтверждение новой лексики сборника.
        </p>
      )}
      <button
        className="button"
        onClick={() => {
          reviewHintBaseline.current = progress.hintCount;
          setReview(!review);
          setReviewQueue(reviewWords.map((w) => w.id));
          setReviewIndex(0);
          setAnswer('');
          setResult(null);
        }}
      >
        Повторить сложные слова ({reviewWords.length})
      </button>
      {review && (
        <section className="panel padding wb-word-review">
          {current ? (
            <>
              <h2>
                Что значит <WorkbookText text={current.form} />?
              </h2>
              <small>
                Источник слова:{' '}
                {editionLabel(
                  current.occurrences.find((o) => o.sourceId === edition)?.sourceId ||
                    current.occurrences[0].sourceId ||
                    edition,
                )}
              </small>
              <WorkbookAudio text={current.form} />
              {[
                current.meanings[0].ru,
                ...workbookWords
                  .filter((w) => w.meanings[0].ru !== current.meanings[0].ru)
                  .slice(0, 2)
                  .map((w) => w.meanings[0].ru),
              ]
                .sort((a, b) => a.localeCompare(b, 'ru'))
                .map((value) => (
                  <label className="wb-review-option" key={value}>
                    <input
                      type="radio"
                      name="word-review"
                      disabled={result === true}
                      checked={answer === value}
                      onChange={() => {
                        setAnswer(value);
                        if (result === false) setResult(null);
                      }}
                    />
                    {value}
                  </label>
                ))}
              <p role="status">
                {result === true
                  ? 'Верно!'
                  : result === false
                    ? 'Послушай слово и вспомни пример. Попробуй ещё раз.'
                    : ''}
              </p>
              {result === true ? (
                <button
                  className="button"
                  onClick={() => {
                    setAnswer('');
                    setResult(null);
                    reviewHintBaseline.current = progress.hintCount;
                    setReviewIndex((i) => i + 1);
                  }}
                >
                  Следующее слово
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={!answer}
                  onClick={() => void checkReview()}
                >
                  Проверить слово
                </button>
              )}
            </>
          ) : (
            <>
              <h2>На сегодня всё</h2>
              <p>Добавляй незнакомые слова в повторение.</p>
            </>
          )}
        </section>
      )}
      <div className="reader-controls" data-dictionary-total={matching.length}>
        <p role="status">
          Найдено словоформ: {matching.length} · Страница {currentPage + 1} из {pageCount}
        </p>
        <button
          className="button"
          disabled={currentPage === 0}
          onClick={() => setPageIndex(currentPage - 1)}
        >
          Предыдущие слова
        </button>
        <button
          className="button"
          disabled={currentPage + 1 === pageCount}
          onClick={() => setPageIndex(currentPage + 1)}
        >
          Следующие слова
        </button>
      </div>
      <div className="dictionary-grid wb-dictionary">
        {visibleGroups.map((group) => {
          const primary =
            group.find((w) => w.form.toLowerCase() === w.lemma.toLowerCase()) || group[0];
          const base = getLexeme(primary.lexemeId)!;
          const lemma = {
            ...base,
            normalizedOnly: !workbookWords.some(
              (w) =>
                w.lexemeId === primary.lexemeId && w.form.toLowerCase() === w.lemma.toLowerCase(),
            ),
          };
          return (
            <article
              className="word-card panel wb-word-card"
              key={showForms ? primary.id : primary.lexemeId}
              data-word-form={primary.id}
            >
              <h2>
                {showForms ? <WorkbookText text={primary.form} /> : lemma.lemma} —{' '}
                {showForms ? primary.meanings[0].ru : lemma.ru}
              </h2>
              {!showForms && lemma.normalizedOnly && (
                <small>
                  Основа нормализована; самостоятельное употребление пока не подтверждено.
                </small>
              )}
              <WorkbookIllustration id={primary.id} />
              <span className="eyebrow">{primary.partOfSpeech}</span>
              {!showForms && (
                <>
                  <p className="ipa">/{lemma.ipa}/</p>
                  <WorkbookAudio text={lemma.pronunciationText} label="Основное слово" />
                </>
              )}
              {group.map((w) => (
                <section className="wb-form" key={w.id}>
                  <h3>
                    <WorkbookText text={w.form} />
                    <span className="wb-form-status">
                      {status(w.id) === 'mastered'
                        ? '✓ Выучено'
                        : status(w.id) === 'review'
                          ? '↻ Нужно повторить'
                          : status(w.id) === 'learning'
                            ? 'Изучается'
                            : 'Не изучено'}
                    </span>
                  </h3>
                  <p className="ipa">/{w.ipa}/</p>
                  <p>{w.meanings[0].ru}</p>
                  <WorkbookAudio text={w.form} label={w.form} />
                  <details>
                    <summary>Почему слово изменилось?</summary>
                    <p>
                      <WorkbookText text={w.grammar} />
                    </p>
                    {w.form.toLowerCase() !== w.lemma.toLowerCase() && (
                      <p>
                        Основная форма: {w.lemma}. В карточке показано именно произношение формы{' '}
                        {w.form}.
                      </p>
                    )}
                    {w.meanings.slice(1).map((m) => (
                      <p key={m.id}>
                        {m.context}: {m.ru}
                      </p>
                    ))}
                  </details>
                  <div className="wb-example">
                    <WorkbookText text={w.example.en} />
                    <p>{w.example.ru}</p>
                    <WorkbookAudio text={w.example.en} label="Пример" />
                  </div>
                  <FormReviewButton id={w.id} />
                  <details>
                    <summary>Подтверждённые места в сборнике</summary>
                    <ul>
                      {w.occurrences.map((o, i) => (
                        <li key={i}>
                          {editionLabel(o.sourceId || edition)} · Стр.{' '}
                          {o.printedPages?.join('–') || o.bookPage} ·{' '}
                          {o.exerciseNumber === null
                            ? 'номер не проверен'
                            : '№ ' + getSourceExercise(o.exerciseId)?.number}{' '}
                          · {getSourceExercise(o.exerciseId)?.lesson}{' '}
                          {!!getSourceExercise(o.exerciseId)?.adaptationIds.length ? (
                            <Link
                              to={
                                '/workbook/' +
                                (getSourceExercise(o.exerciseId)?.adaptationIds[0] || o.exerciseId)
                              }
                            >
                              {edition === EDITION_2026
                                ? 'Тренировка по теме →'
                                : 'Открыть задание →'}
                            </Link>
                          ) : (
                            <span>Адаптация этого задания ещё готовится</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>
              ))}
            </article>
          );
        })}
      </div>
      {groups.length === 0 && (
        <p role="status">
          Пока нет проверенного слова с такими условиями. Попробуй другой поиск или фильтр.
        </p>
      )}
    </>
  );
}
