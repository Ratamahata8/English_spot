import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  sourceExercises,
  workbookExercises,
  getWorkbookExercise,
  getSourceExercise,
  getWordForm,
  getSkill,
} from '../workbook';
import { useWorkbook } from '../workbook/store';
import { checkTask, recordWorkbookAttempt, diagnose, preparationPlan } from '../workbook/learning';
import { WorkbookText, WorkbookAudio } from '../workbook/components';
import { HintToggle } from '../components/Hints';
import { Preparation } from '../workbook/Preparation';
import { TaskRenderer } from '../workbook/TaskRenderer';
import { stopAudio } from '../services/audio';
import type { Answer, WorkbookExercise } from '../workbook/types';
function useWorkbookInit() {
  const init = useWorkbook((s) => s.init);
  useEffect(() => {
    void init();
  }, [init]);
}
export function Workbook() {
  useWorkbookInit();
  const { progress, ready, error } = useWorkbook();
  const [module, setModule] = useState('1'),
    [page, setPage] = useState(''),
    [mode, setMode] = useState('sequence');
  const visible = sourceExercises.filter(
    (e) =>
      (module === 'all' || e.module === module) &&
      (!page || e.bookPage === Number(page) || e.continuationPages.includes(Number(page))),
  );
  const completed = sourceExercises.filter(
    (e) => e.module === module && progress.completed.includes(e.id),
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">БЫКОВА · ПОСПЕЛОВА / 2017</span>
          <h1>Сборник упражнений</h1>
          <p>Выбирай страницу из своего сборника или двигайся по порядку.</p>
        </div>
      </div>
      <div className="wb-intro panel padding">
        <h2>Сначала разберёмся, потом решим</h2>
        <p>
          Сейчас доступны все 33 упражнения первого модуля: страницы 13–24. В каталоге учтены 313
          упражнений сборника. Повторение, вводный тест и модули 2–8 пока в плане.
        </p>
        <div className="reader-controls">
          <button
            className="button"
            aria-pressed={mode === 'sequence'}
            onClick={() => setMode('sequence')}
          >
            По порядку
          </button>
          <button
            className="button"
            aria-pressed={mode === 'source'}
            onClick={() => setMode('source')}
          >
            По учебнику
          </button>
          <Link className="button" to="/dictionary?source=workbook">
            Слова сборника →
          </Link>
        </div>
      </div>
      {error && (
        <div role="alert">
          {error}
          <button className="button" onClick={() => void useWorkbook.getState().retry()}>
            Повторить сохранение
          </button>
        </div>
      )}
      {mode === 'sequence' && (
        <section className="textbook-banner">
          <span className="book-label">ТВОЙ СЛЕДУЮЩИЙ ШАГ</span>
          <h2>{getWorkbookExercise(progress.currentId)?.title}</h2>
          <p>К каждому заданию есть подготовка, словарные карточки и объяснение ошибок.</p>
          {ready && (
            <Link className="button primary" to={'/workbook/' + progress.currentId}>
              Продолжить сборник →
            </Link>
          )}
        </section>
      )}
      <div className="reader-filters">
        <label>
          Раздел
          <select
            aria-label="Раздел сборника"
            value={module}
            onChange={(e) => {
              setModule(e.target.value);
              setPage('');
            }}
          >
            <option value="all">Все разделы</option>
            <option value="revision">Повторение</option>
            <option value="entry">Вводный тест</option>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i} value={String(i + 1)}>
                Модуль {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Печатная страница
          <input
            aria-label="Печатная страница"
            type="number"
            min={4}
            max={127}
            value={page}
            onChange={(e) => {
              setPage(e.target.value);
              setModule('all');
              setMode('source');
            }}
            placeholder="Например, 13"
          />
        </label>
      </div>
      <p className="wb-coverage">
        {module === 'all'
          ? 'По всем разделам'
          : module === 'revision'
            ? 'Повторение'
            : module === 'entry'
              ? 'Вводный тест'
              : 'Модуль ' + module}
        : выполнено {module === 'all' ? progress.completed.length : completed} /{' '}
        {sourceExercises.filter((e) => module === 'all' || e.module === module).length}. Неготовые
        задания не открываются как работающие.
      </p>
      {!visible.length && (
        <p role="status">
          На этой странице нет начала или продолжения упражнения. Номера указаны по печатному
          сборнику.
        </p>
      )}
      <div className="wb-catalog">
        {visible.map((source) => {
          const ex = getWorkbookExercise(source.id);
          return (
            <article
              className={'panel wb-catalog-card' + (!ex ? ' planned' : '')}
              key={source.id}
              data-source={source.id}
            >
              <span className="eyebrow">
                {source.module === 'revision'
                  ? 'ПОВТОРЕНИЕ'
                  : source.module === 'entry'
                    ? 'ВВОДНЫЙ ТЕСТ'
                    : 'МОДУЛЬ ' + source.module}{' '}
                · {source.lesson === 'review' ? 'ЗАКРЕПЛЕНИЕ' : source.lesson}
              </span>
              <h2>
                Стр. {source.bookPage} · № {source.number}
              </h2>
              <p>{ex?.title || 'Авторская адаптация ещё не подготовлена'}</p>
              {source.continuationPages.length > 0 && (
                <small>Продолжение: стр. {source.continuationPages.join(', ')}</small>
              )}
              {ex ? (
                <>
                  <span>
                    {progress.completed.includes(ex.id) ? '✓ Выполнено' : 'Готово к занятиям'}
                  </span>
                  <Link className="button primary" to={'/workbook/' + ex.id}>
                    Открыть упражнение →
                  </Link>
                </>
              ) : (
                <span className="pill">В плане</span>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
export function WorkbookRoute() {
  const { exerciseId = '' } = useParams();
  const exercise = getWorkbookExercise(exerciseId);
  return exercise ? (
    <WorkbookSession key={exerciseId} exercise={exercise} />
  ) : (
    <section className="panel padding">
      <h1>
        {getSourceExercise(exerciseId) ? 'Это упражнение ещё готовится' : 'Упражнение не найдено'}
      </h1>
      <p>Рабочая адаптация пока не опубликована.</p>
      <Link className="button" to="/workbook">
        К сборнику →
      </Link>
    </section>
  );
}
function WorkbookSession({ exercise }: { exercise: WorkbookExercise }) {
  useWorkbookInit();
  const { progress: p, update, ready, error, saving } = useWorkbook();
  const source = getSourceExercise(exercise.id)!;
  const index = p.positions[exercise.id] || 0;
  const taskKey = exercise.id + ':' + index;
  const [answerSlot, setAnswerSlot] = useState<{ key: string; value: Answer }>({
    key: taskKey,
    value: {},
  });
  const [resultSlot, setResultSlot] = useState<{ key: string; value: boolean | null }>({
    key: taskKey,
    value: null,
  });
  const answer = answerSlot.key === taskKey ? answerSlot.value : {};
  const result = resultSlot.key === taskKey ? resultSlot.value : null;
  const setAnswer = (value: Answer) => setAnswerSlot({ key: taskKey, value });
  const setResult = (value: boolean | null) => setResultSlot({ key: taskKey, value });
  const [errors, setErrors] = useState(0),
    [hint, setHint] = useState(0),
    [usedHint, setUsedHint] = useState(false),
    [prep, setPrep] = useState<string[] | null>(null),
    [slow, setSlow] = useState(false),
    [busy, setBusy] = useState(false);
  const done = index >= exercise.tasks.length;
  const task = exercise.tasks[index];
  const hintBaseline = useRef(p.hintCount);
  const closePrep = useCallback(() => setPrep(null), []);
  useEffect(() => {
    if (ready && p.currentId !== exercise.id)
      void update((p) => ({ ...p, currentId: exercise.id }));
  }, [ready, p.currentId, exercise.id, update]);
  useEffect(() => {
    if (!ready || done) return;
    let last = Date.now();
    const flush = () => {
      const delta = Math.floor((Date.now() - last) / 1000);
      if (delta > 0) {
        last += delta * 1000;
        void update((p) => ({ ...p, seconds: p.seconds + delta }));
      }
    };
    const timer = setInterval(flush, 10000);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      stopAudio();
      flush();
    };
  }, [ready, done, exercise.id, update]);
  useEffect(() => {
    setAnswer({});
    setResult(null);
    setErrors(0);
    setHint(0);
    setUsedHint(false);
    hintBaseline.current = p.hintCount;
  }, [ready, index, exercise.id]);
  async function prepare(ids = exercise.skillIds) {
    setUsedHint(true);
    await update((p) => ({ ...p, hintCount: p.hintCount + 1 }));
    setPrep(ids);
  }
  async function verify() {
    if (busy || result === true) return;
    setBusy(true);
    const correct = checkTask(task, answer),
      assisted = usedHint || p.hintCount > hintBaseline.current || task.mode === 'template';
    const tested = correct
      ? task.skillIds || exercise.skillIds
      : diagnose(task, answer, task.skillIds || exercise.skillIds);
    await update((p) =>
      recordWorkbookAttempt(
        p,
        {
          exerciseId: exercise.id,
          task: index,
          correct,
          hinted: assisted,
          at: Date.now(),
          skillIds: tested,
          kind: 'exercise',
        },
        answer,
      ),
    );
    setResult(correct);
    if (!correct) {
      const n = errors + 1;
      setErrors(n);
      if (n === 2) void prepare(tested);
    }
    setBusy(false);
  }
  async function next() {
    if (result !== true || busy) return;
    stopAudio();
    setBusy(true);
    await update((p) => ({
      ...p,
      positions: { ...p.positions, [exercise.id]: index + 1 },
      completed:
        index + 1 === exercise.tasks.length
          ? [...new Set([...p.completed, exercise.id])]
          : p.completed,
    }));
    setBusy(false);
  }
  if (!ready) return <p role="status">Открываем сборник…</p>;
  const inModule = sourceExercises.filter((e) => e.module === source.module),
    completed = p.completed.filter((id) => inModule.some((e) => e.id === id)).length;
  if (done) {
    const nextExercise = workbookExercises[workbookExercises.indexOf(exercise) + 1];
    return (
      <section className="finish panel">
        {saving ? (
          <p role="status">Сохраняем результат…</p>
        ) : error ? (
          <>
            <p role="alert">{error}</p>
            <button className="button primary" onClick={() => void useWorkbook.getState().retry()}>
              Повторить сохранение
            </button>
          </>
        ) : (
          <>
            <span className="finish-star">✦</span>
            <h1>Упражнение выполнено!</h1>
            <p>
              {exercise.title}. Прогресс модуля: {completed} / {inModule.length}.
            </p>
            {error && (
              <div role="alert">
                {error}
                <button className="button" onClick={() => void useWorkbook.getState().retry()}>
                  Повторить сохранение
                </button>
              </div>
            )}
            {nextExercise ? (
              <Link className="button primary" to={'/workbook/' + nextExercise.id}>
                Следующее упражнение →
              </Link>
            ) : (
              <p>Первый модуль завершён. Следующие модули ещё готовятся.</p>
            )}
            <button
              className="button"
              onClick={() =>
                void update((p) => ({
                  ...p,
                  positions: { ...p.positions, [exercise.id]: 0 },
                  completed: p.completed.filter((id) => id !== exercise.id),
                }))
              }
            >
              Потренироваться ещё раз
            </button>
            <Link className="button" to="/workbook">
              К сборнику
            </Link>
          </>
        )}
      </section>
    );
  }
  const plan = preparationPlan(exercise.skillIds, p);
  return (
    <>
      <div className="lesson-top">
        <Link to="/workbook">← К сборнику</Link>
        <span>
          Модуль {source.module} · {source.lesson} · стр. {source.bookPage} · № {source.number}
        </span>
        <HintToggle />
      </div>
      <div className="wb-module-progress">
        <span>
          Выполнено в модуле: {completed} / {inModule.length}
        </span>
        <span>
          Шаг {index + 1} / {exercise.tasks.length}
        </span>
      </div>
      {error && (
        <div role="alert">
          {error}
          <button className="button" onClick={() => void useWorkbook.getState().retry()}>
            Повторить сохранение
          </button>
        </div>
      )}
      <section className="exercise panel wb-exercise" data-workbook={exercise.id} data-task={index}>
        <span className="eyebrow">АВТОРСКАЯ ТРЕНИРОВКА ПО СБОРНИКУ</span>
        <h1>{exercise.title}</h1>
        <p>{exercise.instruction}</p>
        <div className="reader-controls">
          <button className="button primary" onClick={() => void prepare()}>
            Подготовиться к заданию
          </button>
          <button
            className="button"
            aria-pressed={slow}
            onClick={() => {
              stopAudio();
              setSlow(!slow);
            }}
          >
            Медленно {slow ? '0.75×' : '1×'}
          </button>
          <button
            className="button"
            onClick={() => {
              setHint(Math.min(3, hint + 1));
              setUsedHint(true);
              void update((p) => ({ ...p, hintCount: p.hintCount + 1 }));
            }}
          >
            Нужна подсказка
          </button>
        </div>
        {plan.length > 0 && (
          <p className="wb-prep-notice">
            Можно сначала подготовиться: {getSkill(plan[0])?.title}. Уже понятно? Решай сразу.
          </p>
        )}
        <div className="wb-task-prompt">
          <WorkbookText text={task.prompt} />
          {!['letters', 'anagram'].includes(exercise.mechanic) && (
            <WorkbookAudio text={task.prompt} label="Слова задания" slow={slow} />
          )}
        </div>
        <TaskRenderer
          key={exercise.id + '-' + index}
          task={task}
          answer={answer}
          onChange={(a) => {
            setAnswer(a);
            if (result === false) setResult(null);
          }}
          disabled={result === true || busy}
          slow={slow}
        />
        {hint > 0 && (
          <aside className="wb-help" aria-label="Подсказка к сборнику">
            <h2>
              {hint === 1 ? 'Начни со слов' : hint === 2 ? 'Вспомни смысл' : 'Действуй по шагам'}
            </h2>
            {hint === 1 ? (
              exercise.wordIds.slice(0, 5).map((id) => {
                const w = getWordForm(id)!;
                return (
                  <p key={id}>
                    <WorkbookText text={w.form} /> — {w.meanings[0].ru}{' '}
                    <WorkbookAudio text={w.form} label={w.form} slow={slow} />
                  </p>
                );
              })
            ) : (
              <p>
                {hint === 2
                  ? getSkill(exercise.skillIds[0])?.explanation
                  : 'Прочитай условие. Найди знакомые слова. Вспомни правило из подготовки. Проверь каждую часть, затем весь ответ.'}
              </p>
            )}
          </aside>
        )}
        <div className="wb-feedback" role="status">
          {result === false && (
            <>
              <h2>Давай разберёмся</h2>
              <p>
                {errors < 2
                  ? getSkill(diagnose(task, answer, exercise.skillIds)[0])?.explanation
                  : task.why}
              </p>
              <p>Можно изменить ответ и попробовать снова. Подготовка поможет найти причину.</p>
            </>
          )}
          {result === true && (
            <>
              <h2>{task.mode === 'template' ? 'Твой вариант собран!' : 'Получилось!'}</h2>
              <p>
                <WorkbookText text={task.why} />
              </p>
              {task.mode === 'template' && (
                <p>
                  Это работа с опорой на шаблон. Её результат не считается самостоятельным освоением
                  правила.
                </p>
              )}
              {task.answers && (
                <div className="wb-correct-answer">
                  <WorkbookText text={task.answers[0].replaceAll(' | ', ' · ')} />
                  <WorkbookAudio text={task.answers[0]} label="Ответ целиком" slow={slow} />
                </div>
              )}
            </>
          )}
        </div>
        {result === true ? (
          <button
            className="button primary"
            disabled={busy || saving > 0}
            onClick={() => void next()}
          >
            Дальше в упражнении →
          </button>
        ) : (
          <button className="button primary" disabled={busy} onClick={() => void verify()}>
            Проверить ответ
          </button>
        )}
      </section>
      {prep && <Preparation exercise={exercise} task={index} ids={prep} onClose={closePrep} />}
    </>
  );
}
