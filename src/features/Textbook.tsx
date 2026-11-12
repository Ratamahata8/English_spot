import { TextbookPractice } from './TextbookPractice';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  scenes,
  findScene,
  emptyReader,
  type ReaderProgress,
  type TextbookScene,
} from '../textbook';
import { readerRepository } from '../services/storage';
import { playTextbook, stopAudio } from '../services/audio';
import { getLesson } from '../lessons';
const BASE = import.meta.env.BASE_URL;
export function Textbook() {
  const [params] = useSearchParams();
  if (params.get('view') === 'reader') return <LegacyTextbook />;
  return <TextbookPractice />;
}
function LegacyTextbook() {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState(0);
  const [records, setRecords] = useState<ReaderProgress[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void readerRepository
      .loadAll()
      .then(setRecords)
      .catch(() => setError('Не удалось прочитать сохранённые реплики.'));
  }, []);
  const filtered = scenes.filter(
    (s) =>
      (!module || s.module === module) &&
      `${s.title} ${s.page}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SPOTLIGHT 3 / ЧАСТЬ 1</span>
          <h1>
            Учебник оживает<span className="comic-star">✦</span>
          </h1>
          <p>Нажми на реплику. Послушай, разберись и попробуй сказать сам.</p>
        </div>
      </div>
      <section className="book-intro">
        <span className="book-label">ЧИТАЙ • СЛУШАЙ • ПОНИМАЙ</span>
        <h2>
          Здесь можно спросить
          <br />
          про каждую реплику.
        </h2>
        <p>
          4 комикса Arthur + Rascal и 7 разговорных страниц. Номер страницы — как в бумажном
          учебнике. Это отдельный учебник, не сборник упражнений 2026.
        </p>
      </section>
      <div className="reader-filters">
        <label>
          Страница или название
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Например, 76 или Rascal"
            type="search"
          />
        </label>
        <label>
          Модуль
          <select value={module} onChange={(e) => setModule(Number(e.target.value))}>
            <option value={0}>Все модули</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Модуль {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {!filtered.length && (
        <p role="status">Такой страницы пока нет. Попробуй другой номер или выбери все модули.</p>
      )}
      <div className="book-grid">
        {filtered.map((scene) => {
          const record = records.find((p) => p.sceneId === scene.id);
          return (
            <Link to={'/textbook/' + scene.id} className="book-card" key={scene.id}>
              <div className="book-cover">
                <img src={BASE + scene.image} alt="" loading="lazy" />
                <span>СТР. {scene.page}</span>
              </div>
              <div>
                <span className="eyebrow">
                  МОДУЛЬ {scene.module} · {scene.kind === 'comic' ? 'КОМИКС' : 'РАЗГОВОР'}
                </span>
                <h2>{scene.title}</h2>
                <p>{scene.lines.length} реплик · перевод · объяснения</p>
                <small>
                  Понятно: {record?.understood.length || 0} / {scene.lines.length}
                </small>
                <strong className="book-open">{record ? 'Продолжить' : 'Открыть'} ↗</strong>
              </div>
            </Link>
          );
        })}
      </div>
      <section className="panel padding spaced">
        <h2>Мои фразы</h2>
        <p>Нажимай «Сохранить фразу» в комиксе — она появится здесь.</p>
        <div className="saved-phrases">
          {records.flatMap((p) =>
            p.bookmarks.map((id) => {
              const scene = findScene(p.sceneId)!;
              const line = scene.lines.find((l) => l.id === id)!;
              return (
                <Link className="button" key={id} to={`/textbook/${scene.id}?line=${id}`}>
                  {line.en} <small>стр. {scene.page} ↗</small>
                </Link>
              );
            }),
          )}
        </div>
      </section>
      <p className="reader-credit">
        Страницы: «Английский в фокусе / Spotlight 3», часть 1, Н. Быкова и др. Изображения из
        предоставленного учебника. Переводы, пояснения и синтезированная озвучка подготовлены для
        приложения.
      </p>
    </>
  );
}
export function TextbookRoute() {
  const { sceneId = '' } = useParams();
  const scene = findScene(sceneId);
  return scene ? (
    <Reader key={scene.id} scene={scene} />
  ) : (
    <section className="panel padding">
      <h1>Страница не найдена</h1>
      <Link to="/textbook?view=reader">Выбрать страницу →</Link>
    </section>
  );
}
function Reader({ scene }: { scene: TextbookScene }) {
  const [record, setRecord] = useState(() => emptyReader(scene));
  const current = useRef(record);
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [translation, setTranslation] = useState(false);
  const [slow, setSlow] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [playing, setPlaying] = useState('');
  const [sequence, setSequence] = useState(false);
  const [error, setError] = useState('');
  const helpElement = useRef<HTMLElement>(null);
  const token = useRef(0);
  const writes = useRef(Promise.resolve());
  const mounted = useRef(true);
  const line = scene.lines[index];
  function cancel() {
    token.current++;
    stopAudio();
    setPlaying('');
    setSequence(false);
  }
  function save(next: ReaderProgress) {
    next = { ...next, updatedAt: Date.now() };
    current.current = next;
    setRecord(next);
    writes.current = writes.current.catch(() => {}).then(() => readerRepository.save(next));
    void writes.current.catch(() => {
      if (mounted.current)
        setError('Не удалось сохранить отметки. Проверь доступ браузера к хранилищу.');
    });
  }
  useEffect(() => {
    mounted.current = true;
    void readerRepository
      .loadAll()
      .then((records) => {
        if (!mounted.current) return;
        const saved = records.find((p) => p.sceneId === scene.id) || emptyReader(scene);
        const requested = new URLSearchParams(window.location.hash.split('?')[1] || '').get('line');
        const i = scene.lines.findIndex((l) => l.id === (requested || saved.lastLineId));
        const selected = { ...saved, lastLineId: scene.lines[Math.max(0, i)].id };
        current.current = selected;
        setRecord(selected);
        if (requested && i >= 0) save(selected);
        setIndex(Math.max(0, i));
        setReady(true);
      })
      .catch(() => {
        if (mounted.current) {
          setError('Не удалось открыть сохранение. Отметки могут не сохраниться.');
          setReady(true);
        }
      });
    return () => {
      mounted.current = false;
      token.current++;
      stopAudio();
    };
  }, [scene]);
  function select(i: number, reveal = false) {
    cancel();
    setIndex(i);
    setTranslation(false);
    save({ ...current.current, lastLineId: scene.lines[i].id });
    if (reveal && window.matchMedia('(max-width: 1000px)').matches) {
      requestAnimationFrame(() => {
        if (!mounted.current) return;
        helpElement.current?.focus({ preventScroll: true });
        helpElement.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    }
  }
  async function listen(text: string, language: 'en-GB' | 'ru-RU', heardId?: string) {
    cancel();
    const id = token.current;
    setError('');
    setPlaying(language);
    try {
      const complete = await playTextbook(text, language, slow);
      if (!mounted.current || token.current !== id) return;
      if (complete && heardId)
        save({ ...current.current, heard: [...new Set([...current.current.heard, heardId])] });
    } catch {
      if (mounted.current && token.current === id)
        setError('Аудио не запустилось. Проверь подключение и нажми ещё раз.');
    } finally {
      if (mounted.current && token.current === id) setPlaying('');
    }
  }
  async function listenAll() {
    cancel();
    const id = token.current;
    setSequence(true);
    setError('');
    try {
      for (let i = index; i < scene.lines.length; i++) {
        if (token.current !== id || !mounted.current) return;
        const next = scene.lines[i];
        setIndex(i);
        setTranslation(false);
        setPlaying('en-GB');
        save({ ...current.current, lastLineId: next.id });
        if (!(await playTextbook(next.en, 'en-GB', slow))) return;
        if (token.current !== id || !mounted.current) return;
        save({ ...current.current, heard: [...new Set([...current.current.heard, next.id])] });
      }
    } catch {
      if (mounted.current && token.current === id)
        setError('Прослушивание прервалось. Можно продолжить с выбранной реплики.');
    } finally {
      if (mounted.current && token.current === id) {
        setSequence(false);
        setPlaying('');
      }
    }
  }
  function toggle(field: 'bookmarks' | 'understood') {
    const existing = current.current[field];
    save({
      ...current.current,
      [field]: existing.includes(line.id)
        ? existing.filter((id) => id !== line.id)
        : [...existing, line.id],
    });
  }
  if (!ready) return <p role="status">Открываем страницу…</p>;
  return (
    <>
      <Link className="reader-back" to="/textbook?view=reader">
        ← Все страницы
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            УЧЕБНИК, ЧАСТЬ 1 / МОДУЛЬ {scene.module} / СТРАНИЦА {scene.page}
          </span>
          <h1>{scene.title}</h1>
          <p>Выбери облачко на картинке или реплику в списке.</p>
        </div>
      </div>
      <div className="reader-toolbar">
        <button className="button primary" onClick={() => (sequence ? cancel() : void listenAll())}>
          {sequence ? 'Пауза' : 'Слушать по порядку'}
        </button>
        <button
          className="button"
          aria-pressed={slow}
          onClick={() => {
            cancel();
            setSlow(!slow);
          }}
        >
          Медленно {slow ? '✓' : ''}
        </button>
        <button className="button" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>
          Картинка крупнее {zoom ? '−' : '+'}
        </button>
        <span>
          Понятно: {record.understood.length} / {scene.lines.length}
        </span>
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      <div className="reader-layout">
        <section className="reader-art" aria-label="Страница учебника">
          <div
            className="page-scroll"
            tabIndex={zoom ? 0 : undefined}
            aria-label="Изображение страницы, прокручивается при увеличении"
          >
            <div className={'page-image' + (zoom ? ' zoomed' : '')}>
              <img src={BASE + scene.image} alt={`Страница ${scene.page}: ${scene.title}`} />
              {scene.lines.map((l, i) => (
                <button
                  key={l.id}
                  className={'speech-hotspot' + (index === i ? ' selected' : '')}
                  style={{
                    left: l.box[0] + '%',
                    top: l.box[1] + '%',
                    width: l.box[2] + '%',
                    height: l.box[3] + '%',
                  }}
                  aria-label={`Реплика ${i + 1}: ${l.en}`}
                  aria-pressed={index === i}
                  onClick={() => {
                    select(i, true);
                    void listen(l.en, 'en-GB', l.id);
                  }}
                >
                  <span>{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="reader-credit">
            Spotlight 3 · часть 1 · стр. {scene.page} · отдельный источник, не сборник 2026. Увеличь
            картинку или выбери крупную кнопку реплики ниже.
          </p>
        </section>
        <section
          className="reader-help"
          ref={helpElement}
          tabIndex={-1}
          aria-label="Помощь с репликой"
          data-line={line.id}
        >
          <span className="book-label">
            РЕПЛИКА {index + 1} / {scene.lines.length} {playing ? '• ЗВУЧИТ' : ''}
          </span>
          <h2 lang="en-GB">{line.en}</h2>
          <div className="reader-controls">
            <button
              className="button primary"
              onClick={() => void listen(line.en, 'en-GB', line.id)}
            >
              ▶ Английский
            </button>
            <button className="button" onClick={cancel} disabled={!playing}>
              ■ Стоп
            </button>
          </div>
          <button
            className="translation-toggle"
            aria-expanded={translation}
            onClick={() => setTranslation(!translation)}
          >
            {translation ? 'Скрыть перевод' : 'Показать перевод'} <span>↓</span>
          </button>
          {translation && (
            <p className="reader-translation" lang="ru">
              {line.ru}
            </p>
          )}
          <button
            className="button"
            onClick={() => {
              setTranslation(true);
              void listen(line.ru, 'ru-RU');
            }}
          >
            ▶ Перевод голосом
          </button>
          <details key={line.id} className="reader-why">
            <summary>Почему именно так?</summary>
            <p>{line.why}</p>
            <h3>Разберём по кусочкам</h3>
            <div className="phrase-chunks">
              {line.chunks.map((chunk) => (
                <button key={chunk.en} onClick={() => void listen(chunk.en, 'en-GB')}>
                  <strong lang="en-GB">
                    {chunk.en} <span aria-hidden="true">♫</span>
                  </strong>
                  <span>{chunk.ru}</span>
                </button>
              ))}
            </div>
            <p className="reader-prompt">
              Послушай ещё раз. Закрой перевод и попробуй объяснить реплику своими словами.
            </p>
          </details>
          <div className="reader-marks">
            <button
              className="button"
              aria-pressed={record.bookmarks.includes(line.id)}
              onClick={() => toggle('bookmarks')}
            >
              {record.bookmarks.includes(line.id) ? '★ Фраза сохранена' : '☆ Сохранить фразу'}
            </button>
            <button
              className="button"
              aria-pressed={record.understood.includes(line.id)}
              onClick={() => toggle('understood')}
            >
              {record.understood.includes(line.id) ? '✓ Мне понятно' : 'Отметить: мне понятно'}
            </button>
          </div>
          <p className="reader-credit">
            Прослушано по-английски: {record.heard.length}. Отметку «понятно» ставишь ты сам.
          </p>
          <div className="reader-controls">
            <button className="button" disabled={index === 0} onClick={() => select(index - 1)}>
              ← Назад
            </button>
            <button
              className="button primary"
              disabled={index === scene.lines.length - 1}
              onClick={() => select(index + 1)}
            >
              Следующая реплика →
            </button>
          </div>
        </section>
      </div>
      <section className="reader-lines">
        <h2>Все реплики</h2>
        <ol>
          {scene.lines.map((l, i) => (
            <li key={l.id}>
              <button
                aria-current={index === i ? 'true' : undefined}
                onClick={() => {
                  select(i, true);
                  void listen(l.en, 'en-GB', l.id);
                }}
              >
                <span className="line-number">{i + 1}</span>
                <span lang="en-GB">{l.en}</span>
                <span className="line-status">
                  {record.understood.includes(l.id)
                    ? '✓'
                    : record.heard.includes(l.id)
                      ? '♫'
                      : '▶'}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel padding spaced">
        <h2>Потренироваться по теме</h2>
        <p>Хочешь закрепить? Перейди к знакомым словам и заданиям этого модуля.</p>
        <div className="reader-controls">
          {scene.lessonIds.map((id) => (
            <Link className="button" key={id} to={'/learn/' + id}>
              {getLesson(id).title} →
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
