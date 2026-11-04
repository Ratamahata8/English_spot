import { useEffect, useRef, useState } from 'react';
import { getLesson, byId } from '../lessons';
import { useProgress } from '../stores/progress';
import {
  checkAnswer,
  recordAttempt,
  remedialFor,
  emptySkill,
  updateSkill,
} from '../services/learning';
import { AudioButton } from '../components/AudioButton';
import { Illustration } from '../components/Illustration';
import { EnglishText } from '../components/Hints';
import { playAudio, stopAudio } from '../services/audio';
import type { Exercise } from '../types';
const BASE = import.meta.env.BASE_URL;
function shuffled<T>(items: T[], seed: string): T[] {
  return items
    .map((value, i) => ({
      value,
      key: [...seed].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619), i + 29) >>> 0,
    }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.value);
}
export function ExerciseCard({
  exercise: e,
  onNext,
  review,
}: {
  exercise: Exercise;
  onNext: () => Promise<void>;
  review: boolean;
}) {
  const { progress: p, update } = useProgress();
  const lesson = getLesson(p.lessonId);
  const [selected, setSelected] = useState('');
  const [indices, setIndices] = useState<number[]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [hint, setHint] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [remedial, setRemedial] = useState<string | null>(null);
  const [remAnswer, setRemAnswer] = useState('');
  const [remResult, setRemResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [repeats, setRepeats] = useState(0);
  const hintBaseline = useRef(p.hintCount);
  const w = lesson.vocabulary.find((word) => word.id === e.wordId) || byId(e.wordId);
  const isArrange = e.type === 'letters' || e.type === 'sentence';
  const pieces = shuffled(
    e.type === 'letters' ? e.answer.split('') : e.answer.replace('.', '').split(' '),
    e.id,
  );
  const options = shuffled(e.options, e.id);
  useEffect(() => {
    if (e.type === 'picture') void playAudio(w.en, p.settings.slow).catch(() => {});
    return stopAudio;
  }, [e.id]);
  const answer = isArrange
    ? indices.map((i) => pieces[i]).join(e.type === 'letters' ? '' : ' ')
    : selected;
  async function verify() {
    if (busy || result === 'correct') return;
    setBusy(true);
    const correct = checkAnswer(answer, e.answer);
    const next = recordAttempt(
      p,
      e,
      correct,
      usedHint || p.hintCount > hintBaseline.current,
      Date.now(),
      answer,
    );
    await update(() => next);
    setResult(correct ? 'correct' : 'wrong');
    if (!correct) {
      void playAudio(w.en, p.settings.slow).catch(() => {});
      const id = remedialFor(next, e, answer);
      if (id) {
        setRemedial(id);
        await update((v) => ({ ...v, remedialCount: v.remedialCount + 1 }));
      }
    }
    setBusy(false);
  }
  async function studyNext() {
    if (busy) return;
    setBusy(true);
    try {
      await onNext();
    } finally {
      setBusy(false);
    }
  }
  const extra = lesson.remedial.find((r) => r.id === remedial);
  const openHint = (level: number) => {
    setHint(level);
    setUsedHint(true);
    void update((v) => ({ ...v, hintCount: v.hintCount + 1 }));
  };
  return (
    <>
      <section className="exercise panel" aria-labelledby="exercise-title" data-exercise={e.id}>
        <div className="exercise-meta">
          <span className="eyebrow">
            {
              {
                study: '01 · Знакомимся',
                picture: '02 · Слушаем',
                word: '03 · Узнаём',
                letters: '04 · Пишем',
                sentence: '05 · Строим фразы',
              }[e.type]
            }
          </span>
          <button className="quiet" onClick={() => openHint(hint ? 0 : 1)}>
            Нужна помощь?
          </button>
        </div>
        <h1 id="exercise-title">{e.prompt}</h1>
        {e.type === 'study' ? (
          <>
            <Illustration id={w.id} className="study-image" />
            <EnglishText className="english-title" text={w.en} />
            <p className="ipa">{w.ipa}</p>
            <p className="translation">{w.ru}</p>
            <div className="study-audio">
              <AudioButton text={w.en} large />
              <button
                className="button"
                onClick={() => {
                  setRepeats((r) => r + 1);
                  void playAudio(w.en, p.settings.slow).catch(() => {});
                }}
              >
                Повторить {repeats > 0 && `· ${repeats}`}
              </button>
            </div>
            <div className="sentence-example">
              <EnglishText text={w.example} />
              <AudioButton text={w.example} label="Пример" />
            </div>
            <label className="speed study-speed">
              <input
                type="checkbox"
                checked={p.settings.slow}
                onChange={(ev) =>
                  void update((v) => ({
                    ...v,
                    settings: { ...v.settings, slow: ev.target.checked },
                  }))
                }
              />{' '}
              Медленно · 0.75×
            </label>
            <button
              className="button primary next"
              disabled={busy}
              onClick={() => void studyNext()}
            >
              Дальше →
            </button>
          </>
        ) : (
          <>
            {e.type === 'picture' ? (
              <AudioButton text={w.en} label="Слушать слово" large />
            ) : w.image ? (
              <Illustration id={w.id} className="task-image" />
            ) : (
              <div className="grammar-art">
                <EnglishText text={w.en} />
              </div>
            )}
            {e.type === 'sentence' && <p className="sentence-target">{e.hint.translation}</p>}
            {e.type !== 'picture' && (
              <AudioButton
                text={e.type === 'sentence' ? e.answer : w.en}
                label={e.type === 'sentence' ? 'Слушать фразу' : 'Слушать слово'}
              />
            )}
            {(e.type === 'picture' || e.type === 'word') && (
              <div className={`options ${e.type === 'picture' ? 'pictures' : ''}`}>
                {options.map((id) => {
                  const o = byId(id);
                  return (
                    <button
                      key={id}
                      data-option={e.answerMode === 'translation' ? o.ru : o.en}
                      className={`option ${selected === (e.answerMode === 'translation' ? o.ru : o.en) ? 'chosen' : ''}`}
                      disabled={result === 'correct'}
                      onClick={() => {
                        setSelected(e.answerMode === 'translation' ? o.ru : o.en);
                        setResult(null);
                      }}
                      aria-label={e.type === 'picture' ? `Картинка: ${o.ru}` : undefined}
                    >
                      {e.type === 'picture' ? (
                        <Illustration id={id} />
                      ) : e.answerMode === 'translation' ? (
                        <span>{o.ru}</span>
                      ) : (
                        <EnglishText text={o.en} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {isArrange && (
              <>
                <div className="answer-tray" aria-label="Собранный ответ" aria-live="polite">
                  {indices.length ? (
                    indices.map((i, n) => (
                      <button
                        aria-label={`Убрать ${pieces[i]}`}
                        className="tile"
                        disabled={result === 'correct'}
                        key={`${i}-${n}`}
                        onClick={() => {
                          setIndices((a) => a.filter((_, j) => j !== n));
                          setResult(null);
                        }}
                      >
                        <EnglishText text={pieces[i]} />
                      </button>
                    ))
                  ) : (
                    <span>Нажимай на {e.type === 'letters' ? 'буквы' : 'слова'} внизу</span>
                  )}
                </div>
                <div className="tile-bank">
                  {pieces.map((piece, i) => (
                    <button
                      key={i}
                      className="tile"
                      data-piece={piece}
                      disabled={indices.includes(i) || result === 'correct'}
                      onClick={() => {
                        setIndices((a) => [...a, i]);
                        setResult(null);
                      }}
                    >
                      <EnglishText text={piece} />
                    </button>
                  ))}
                </div>
                <button
                  className="quiet"
                  disabled={!indices.length || result === 'correct'}
                  onClick={() => {
                    setIndices((a) => a.slice(0, -1));
                    setResult(null);
                  }}
                >
                  ↶ Отменить
                </button>
              </>
            )}
            {result && (
              <div className={`feedback ${result}`} role="status">
                {result === 'correct' ? (
                  <>
                    <strong>Отлично, получилось! ✨</strong>
                    {e.type === 'sentence' && (
                      <p>
                        {e.hint.explanation} <EnglishText text={e.answer} />
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <strong>Давай попробуем ещё раз</strong>
                    <p>Послушай слово или открой подсказку. Ошибаться — часть обучения.</p>
                    <button className="quiet" onClick={() => openHint(1)}>
                      Открыть помощь
                    </button>
                  </>
                )}
              </div>
            )}
            <div className="exercise-footer">
              {result === 'correct' ? (
                <button className="button primary" onClick={() => void onNext()}>
                  Дальше →
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={!answer || busy}
                  onClick={() => void verify()}
                >
                  Проверить
                </button>
              )}
              <label className="speed">
                <input
                  type="checkbox"
                  checked={p.settings.slow}
                  onChange={(ev) =>
                    void update((v) => ({
                      ...v,
                      settings: { ...v.settings, slow: ev.target.checked },
                    }))
                  }
                />{' '}
                Медленно · 0.75×
              </label>
            </div>
          </>
        )}
      </section>
      <div className="lesson-note">
        <img src={BASE + 'illustrations/spotty.svg'} alt="" />
        <p>
          Я рядом! Нажми <strong>?</strong>, а потом на английское слово — разберём его вместе.
          <br />
          <span>Или подержи палец на слове.</span>
        </p>
      </div>
      {hint > 0 && (
        <section className="panel hint-panel" aria-label="Помощь с заданием">
          <div className="hint-tabs">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`button ${hint === n ? 'selected' : ''}`}
                onClick={() => openHint(n)}
              >
                {n === 1 ? '1 · Слово' : n === 2 ? '2 · Смысл' : '3 · По шагам'}
              </button>
            ))}
            <button className="close-inline" onClick={() => setHint(0)} aria-label="Закрыть помощь">
              ×
            </button>
          </div>
          {hint === 1 ? (
            <>
              <EnglishText text={w.en} />
              <p>
                {w.ru} · {w.ipa}
              </p>
              <AudioButton text={w.en} />
            </>
          ) : hint === 2 ? (
            <>
              <p>{e.hint.translation}</p>
              <p>{e.hint.explanation}</p>
            </>
          ) : (
            <>
              <ol>
                {e.hint.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <p>
                Похожий пример: <EnglishText text={e.hint.example} />
              </p>
              <AudioButton text={e.hint.example} />
            </>
          )}
        </section>
      )}
      {extra && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-label="Мини-урок">
            <span className="eyebrow">Маленькая остановка · {p.remedialCount} из 2</span>
            <h2>{extra.title}</h2>
            <p>{extra.explanation}</p>
            <div className="example">
              <EnglishText text={extra.example} />
              <AudioButton text={extra.example} />
            </div>
            <h3>{extra.question}</h3>
            <div className="options">
              {extra.options.map((s) => (
                <button
                  autoFocus={s === extra.options[0]}
                  className={`option ${remAnswer === s ? 'chosen' : ''}`}
                  key={s}
                  onClick={() => setRemAnswer(s)}
                >
                  <EnglishText text={s} />
                </button>
              ))}
            </div>
            <button
              className="button primary"
              disabled={!remAnswer}
              onClick={() => {
                if (checkAnswer(remAnswer, extra.answer)) {
                  setRemResult('Верно! Вернёмся к заданию.');
                  void update((v) => ({
                    ...v,
                    remedialDone: [...new Set([...v.remedialDone, extra.id])],
                    stats: {
                      ...v.stats,
                      [extra.id]: updateSkill(v.stats[extra.id] || emptySkill(), true, true),
                    },
                  }));
                } else setRemResult('Вспомни объяснение выше и попробуй ещё.');
              }}
            >
              Проверить мини-задание
            </button>
            <p role="status">{remResult}</p>
            <button
              className="button"
              onClick={() => {
                setRemedial(null);
                setRemAnswer('');
                setRemResult('');
              }}
            >
              Вернуться к заданию{remResult.startsWith('Верно') ? '' : ' · продолжить позже'}
            </button>
          </section>
        </div>
      )}
      {review && (
        <p className="muted centered">
          Слово считается освоенным после нескольких самостоятельных успехов в разных упражнениях.
        </p>
      )}
    </>
  );
}
