import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  practiceUnits,
  practiceCounts,
  spokenAnswer,
  type PracticeUnit,
  type PracticeTask,
  type PracticeAnswer,
  type PracticeProgress,
  recordPracticeAnswer,
  advancePractice,
  restartPractice,
} from '../textbook2026';
import { scaffold } from '../textbook2026/scaffolds';
import { textbookPracticeRepository } from '../services/storage';
import { HintToggle, EnglishText } from '../components/Hints';
import { AudioButton } from '../components/AudioButton';
import { hasAudio, stopAudio } from '../services/audio';
import { useProgress } from '../stores/progress';
import { PageHeading } from '../components/PageHeading';
import './textbook-practice.css';

function Spoken({ text }: { text: string }) {
  return (
    <>
      <EnglishText text={text} />
      {hasAudio(text) && <AudioButton text={text} label="Слушать" />}
    </>
  );
}
const modules: Record<string, string> = {
  starter: 'Перед началом',
  '1': 'Модуль 1 · Школа',
  '2': 'Модуль 2 · Семья',
  '3': 'Модуль 3 · Еда',
  '4': 'Модуль 4 · Игрушки и комната',
  special: 'Праздники',
  culture: 'Мир вокруг',
  appendix: 'Чтение, разговор и грамматика',
};
export function TextbookPractice() {
  const [search, setSearch] = useState(''),
    [module, setModule] = useState('all');
  const [records, setRecords] = useState<PracticeProgress[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    void textbookPracticeRepository
      .loadAll()
      .then(setRecords)
      .catch((e: Error) => setError(e.message));
  }, []);
  const groups = [...new Set(practiceUnits.flatMap((u) => u.sourcePages))]
    .sort((a, b) => a - b)
    .map((page) => ({ page, units: practiceUnits.filter((u) => u.sourcePages.includes(page)) }));
  return (
    <>
      <PageHeading
        eyebrow="SPOTLIGHT 3 · ЧАСТЬ 1 · 2026"
        title="Занимаемся по учебнику"
        description="Открой нужную страницу, разбери правило и потренируйся. Можно возвращаться и проходить задания снова."
      />
      <p className="notice">
        {practiceCounts.pages} страниц · {practiceCounts.sourceExercises} упражнений с номером ·{' '}
        {practiceCounts.steps} шагов тренировки. Это наши интерактивные адаптации по фотографиям, не
        полная перепечатка заданий издателя.
      </p>
      <div className="reader-controls">
        <Link className="button" to="/textbook?view=reader">
          Комиксы и реплики →
        </Link>
        <Link className="button" to="/workbook">
          Сборник упражнений →
        </Link>
      </div>
      <div className="toolbar">
        <label className="search">
          Страница или тема
          <input
            aria-label="Найти страницу учебника"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Например, 38 или семья"
          />
        </label>
        <label>
          Раздел
          <select
            aria-label="Раздел учебника"
            value={module}
            onChange={(e) => setModule(e.target.value)}
          >
            <option value="all">Все разделы</option>
            {Object.entries(modules).map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="tb-pages">
        {groups
          .filter(
            (g) =>
              (module === 'all' || g.units[0].module === module) &&
              `${g.page} ${g.units.map((u) => u.title).join(' ')}`
                .toLowerCase()
                .includes(search.toLowerCase().trim()),
          )
          .map((g) => {
            const completed = g.units.filter((u) =>
              records.some((p) => p.unitId === u.id && p.completedRuns > 0),
            ).length;
            return (
              <article className="panel tb-page" key={g.page} data-textbook-page={g.page}>
                <span className="eyebrow">
                  {modules[g.units[0].module]} · стр. {g.page}
                </span>
                <h2>{g.units[0].title}</h2>
                <p>
                  {g.units
                    .map((u) =>
                      u.sourceExercise === null
                        ? 'Чтение / справочник'
                        : `Упр. ${u.sourceExercise}`,
                    )
                    .join(' · ')}
                </p>
                <p>
                  Пройдено занятий: {completed} / {g.units.length}
                </p>
                <Link className="button primary" to={`/textbook/2026/p${g.page}`}>
                  Открыть страницу {g.page} →
                </Link>
              </article>
            );
          })}
      </div>
    </>
  );
}
export function TextbookPracticeRoute() {
  const { pageId } = useParams();
  const [params, setParams] = useSearchParams();
  const group = practiceUnits.filter((u) => u.sourcePages.some((p) => 'p' + p === pageId));
  const unit = group.find((u) => u.id === params.get('exercise')) || group[0];
  if (!unit)
    return (
      <section className="panel padding">
        <h1>Эта страница не входит в занятия</h1>
        <Link to="/textbook">К учебнику</Link>
      </section>
    );
  return (
    <>
      <Link className="back-link" to="/textbook">
        ← Все страницы учебника
      </Link>
      <p className="eyebrow">
        Учебник · часть 1 · {modules[unit.module]} · страница {unit.page}
      </p>
      <div className="tb-tabs" aria-label="Упражнения страницы">
        {group.map((u) => (
          <button
            className={`button ${u.id === unit.id ? 'selected' : ''}`}
            aria-pressed={u.id === unit.id}
            key={u.id}
            onClick={() => setParams({ exercise: u.id })}
          >
            {u.sourceExercise === null ? 'Чтение и практика' : `Упражнение ${u.sourceExercise}`}
          </button>
        ))}
      </div>
      <PracticeSession key={unit.id} unit={unit} />
    </>
  );
}
function rotate<T>(items: T[], key: string) {
  const n = [...key].reduce((a, c) => a + c.charCodeAt(0), 0) % items.length;
  return [...items.slice(n), ...items.slice(0, n)];
}
const labels: Record<string, string> = {
  name: 'Имя',
  age: 'Возраст',
  place: 'Место',
  weather: 'Погода',
  subject: 'Предмет',
  relative: 'Родственник',
  toy: 'Игрушка',
  colour: 'Цвет',
  food: 'Еда',
  other: 'Другой продукт',
  title: 'Название',
  item: 'Предмет',
  action: 'Действие',
  day: 'День',
  have: 'Что уже есть',
  need: 'Что нужно',
  country: 'Страна',
  capital: 'Столица',
  mother: 'Имя мамы',
  father: 'Имя папы',
  flavour: 'Вкус',
  fruit: 'Фрукт',
  dessert: 'Десерт',
  character: 'Персонаж',
  season: 'Сезон',
  sender: 'Твоё имя',
  activity: 'Занятие',
  animal: 'Животное',
};
function AnswerFields({
  task: t,
  answer,
  setAnswer,
  disabled,
}: {
  task: PracticeTask;
  answer: PracticeAnswer;
  setAnswer: (v: PracticeAnswer) => void;
  disabled: boolean;
}) {
  const [tiles, setTiles] = useState<number[]>([]);
  const object = typeof answer === 'object' ? answer : {};
  if (t.type === 'choice')
    return (
      <div className="tb-options">
        {rotate(t.options!, t.id).map((option) => (
          <button
            key={option}
            className={`button ${answer === option ? 'selected' : ''}`}
            aria-pressed={answer === option}
            data-answer={option}
            disabled={disabled}
            onClick={() => setAnswer(option)}
          >
            <EnglishText text={option} />
          </button>
        ))}
      </div>
    );
  if (t.type === 'input')
    return (
      <label className="tb-input">
        Твой ответ
        <input
          aria-label="Твой ответ"
          value={typeof answer === 'string' ? answer : ''}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </label>
    );
  if (t.type === 'matching')
    return (
      <div className="tb-pairs">
        {t.pairs!.map((pair) => (
          <label key={pair.en}>
            <Spoken text={pair.en} />
            <select
              aria-label={`Пара: ${pair.en}`}
              value={object[pair.en] || ''}
              disabled={disabled}
              onChange={(e) => setAnswer({ ...object, [pair.en]: e.target.value })}
            >
              <option value="">Выбери пару</option>
              {rotate(
                t.pairs!.map((p) => p.ru),
                t.id,
              ).map((ru) => (
                <option key={ru} value={ru}>
                  {ru}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    );
  if (t.type === 'order') {
    const bank = rotate(
      t.tokens!.map((text, i) => ({ text, i })),
      t.id,
    );
    return (
      <>
        <p className="tb-sentence" aria-label="Собранная фраза">
          {tiles.map((i) => t.tokens![i]).join(' ') || 'Составь фразу из слов'}
        </p>
        <div className="tb-options">
          {bank.map(({ text, i }) => (
            <button
              className="button"
              data-tile={text}
              key={i}
              disabled={disabled || tiles.includes(i)}
              onClick={() => {
                const next = [...tiles, i];
                setTiles(next);
                setAnswer(next.map((j) => t.tokens![j]).join(' '));
              }}
            >
              {text}
            </button>
          ))}
        </div>
        <button
          className="quiet"
          disabled={disabled}
          onClick={() => {
            setTiles([]);
            setAnswer('');
          }}
        >
          Начать фразу заново
        </button>
      </>
    );
  }
  return (
    <div className="tb-personal">
      <p>
        Сохраним твой вариант. Свободный текст не оценивается как грамматически верный
        автоматически.
      </p>
      {t.fields!.map((field) => (
        <label key={field}>
          {labels[field] || field}
          <input
            aria-label={labels[field] || field}
            maxLength={80}
            inputMode={field === 'age' ? 'numeric' : 'text'}
            disabled={disabled}
            value={object[field] || ''}
            onChange={(e) => setAnswer({ ...object, [field]: e.target.value })}
          />
        </label>
      ))}
      <p className="example">
        <EnglishText
          text={t.fields!.reduce(
            (text, f) => text.split('{' + f + '}').join(object[f] || '…'),
            t.model!,
          )}
        />
      </p>
    </div>
  );
}
function PracticeSession({ unit: u }: { unit: PracticeUnit }) {
  const [p, setP] = useState<PracticeProgress | null>(null),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const [answer, setAnswer] = useState<PracticeAnswer>(''),
    [wrong, setWrong] = useState(false),
    [mistakes, setMistakes] = useState(0);
  const [help, setHelp] = useState(false),
    [mini, setMini] = useState(false),
    [miniCorrect, setMiniCorrect] = useState(false);
  const slow = useProgress((s) => s.progress.settings.slow),
    updateSettings = useProgress((s) => s.update);
  useEffect(() => {
    void textbookPracticeRepository
      .load(u.id)
      .then(setP)
      .catch((e: Error) => setError(e.message));
    return stopAudio;
  }, [u.id]);
  const task = p && u.tasks.find((t) => t.id === p.activeTaskIds[p.step]);
  useEffect(() => {
    setAnswer(task?.type === 'personal' ? p?.personalAnswers[task.id] || {} : '');
    setWrong(false);
    setMistakes(0);
    setHelp(false);
    setMini(false);
    setMiniCorrect(false);
    stopAudio();
  }, [task?.id]);
  async function change(update: (old: PracticeProgress) => PracticeProgress) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      setP(await textbookPracticeRepository.update(u.id, update));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function hint(simple = false) {
    setHelp(true);
    setMini(simple);
    await change((old) => ({ ...old, hints: old.hints + 1, updatedAt: Date.now() }));
  }
  if (!p) return <p role={error ? 'alert' : 'status'}>{error || 'Открываем занятие…'}</p>;
  const next = practiceUnits[practiceUnits.findIndex((v) => v.id === u.id) + 1];
  if (!task)
    return (
      <section className="panel padding">
        <h1>{p.mode === 'review' ? 'Повторение завершено!' : 'Занятие пройдено!'}</h1>
        <p>
          {u.title} · Пройдено раз: {p.completedRuns}
        </p>
        <button
          className="button primary"
          disabled={saving}
          onClick={() => void change((old) => restartPractice(old, u))}
        >
          Пройти ещё раз →
        </button>
        {p.reviewIds.length > 0 && (
          <button
            className="button"
            disabled={saving}
            onClick={() => void change((old) => restartPractice(old, u, true))}
          >
            Повторить сложное ({p.reviewIds.length})
          </button>
        )}
        {next && (
          <Link className="button" to={`/textbook/2026/p${next.page}?exercise=${next.id}`}>
            Следующее занятие →
          </Link>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
    );
  const s = scaffold(u.skill);
  return (
    <section className="panel padding tb-session" data-unit={u.id} data-task={task.id}>
      <h1>{u.title}</h1>
      <p>{u.explanation}</p>
      <p className="ipa">
        {u.sourceExercise === null
          ? 'Практика по тексту / справочнику'
          : `По цели упражнения ${u.sourceExercise}`}{' '}
        · стр. {u.sourcePages.join('–')} · Свои примеры и задания
      </p>
      <progress aria-label="Прогресс занятия" value={p.step} max={p.activeTaskIds.length} />
      <p>
        Шаг {p.step + 1} из {p.activeTaskIds.length} · Пройдено раз: {p.completedRuns}
      </p>
      <div className="reader-controls">
        <HintToggle />
        <label>
          <input
            type="checkbox"
            checked={slow}
            onChange={(e) =>
              void updateSettings((v) => ({
                ...v,
                settings: { ...v.settings, slow: e.target.checked },
              }))
            }
          />{' '}
          Медленно · 0.75×
        </label>
      </div>
      <h2>
        <EnglishText text={task.prompt} />
      </h2>
      {task.text && (
        <p className="example">
          <Spoken text={task.text} />
        </p>
      )}
      <AnswerFields
        key={task.id + ':' + p.mode}
        task={task}
        answer={answer}
        setAnswer={setAnswer}
        disabled={saving || p.pendingAdvance}
      />
      {!p.pendingAdvance && (
        <button
          className="button primary"
          disabled={saving}
          onClick={() => {
            void change((old) => {
              let next = recordPracticeAnswer(old, u, task.id, answer);
              setWrong(!next.pendingAdvance);
              if (!next.pendingAdvance) {
                setMistakes((n) => n + 1);
                if (mistakes >= 1) {
                  setHelp(true);
                  setMini(true);
                  next = { ...next, hints: next.hints + 1 };
                }
              }
              return next;
            });
          }}
        >
          {task.type === 'personal' ? 'Сохранить мой вариант' : 'Проверить ответ'}
        </button>
      )}
      {wrong && !p.pendingAdvance && (
        <div role="alert" className="tb-feedback">
          <strong>Попробуй ещё раз.</strong>
          <p>{task.why}</p>
        </div>
      )}
      {p.pendingAdvance && (
        <div role="status" className="tb-feedback">
          <strong>{task.type === 'personal' ? 'Твой вариант сохранён.' : 'Верно!'}</strong>
          <p>{task.why}</p>
          {task.answer && (
            <p className="example">
              <EnglishText text={spokenAnswer(task)} />
            </p>
          )}
          {task.pairs && <p>{task.pairs.map((pair) => pair.en + ' — ' + pair.ru).join('; ')}</p>}
          {task.answer && hasAudio(spokenAnswer(task)) && (
            <AudioButton text={spokenAnswer(task)} label="Послушать ответ" />
          )}
          <button
            className="button primary"
            disabled={saving}
            onClick={() => void change((old) => advancePractice(old))}
          >
            Дальше →
          </button>
        </div>
      )}
      <div className="reader-controls">
        <button className="quiet" disabled={saving} onClick={() => void hint()}>
          Подсказка
        </button>
        <button className="quiet" disabled={saving} onClick={() => void hint(true)}>
          Объясни проще
        </button>
      </div>
      {help && (
        <aside className="tb-help">
          <h3>{mini ? 'Разберём на простом примере' : 'Как рассуждать'}</h3>
          <p>{mini ? s.text : task.why}</p>
          {mini && (
            <>
              <p>{s.question}</p>
              <div className="tb-options">
                {s.options.map((v) => (
                  <button className="button" key={v} onClick={() => setMiniCorrect(v === s.answer)}>
                    {v}
                  </button>
                ))}
              </div>
              <p role="status">
                {miniCorrect
                  ? 'Получилось! Вернись к исходному заданию.'
                  : 'Выбери ответ в простом примере.'}
              </p>
              <button
                className="button"
                disabled={!miniCorrect}
                onClick={() => {
                  setMini(false);
                  setHelp(false);
                }}
              >
                Вернуться к заданию
              </button>
            </>
          )}
        </aside>
      )}
      {error && <p role="alert">Не удалось сохранить: {error}. Повтори действие.</p>}
    </section>
  );
}
