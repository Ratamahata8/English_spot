import { Link } from 'react-router-dom';
import { useWorkbook } from '../workbook/store';
import { createContext, useContext, useRef, useState, useEffect, type ReactNode } from 'react';
import { lexicon } from '../lessons';
import type { VocabularyItem } from '../types';
import { AudioButton } from './AudioButton';
import { useProgress } from '../stores/progress';
interface HelpState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  open: (w: VocabularyItem) => void;
}
const Context = createContext<HelpState>({ enabled: false, setEnabled: () => {}, open: () => {} });
export const useHints = () => useContext(Context);
export function HintsProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [word, setWord] = useState<VocabularyItem | null>(null);
  const [added, setAdded] = useState(false);
  const update = useProgress((s) => s.update);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!word && previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [word]);
  const open = (w: VocabularyItem) => {
    previousFocus.current = document.activeElement as HTMLElement;
    setAdded(false);
    setWord(w);
    if (w.sourceFormId)
      void useWorkbook.getState().update((p) => ({ ...p, hintCount: p.hintCount + 1 }));
    else void update((p) => ({ ...p, hintCount: p.hintCount + 1 }));
  };
  return (
    <Context.Provider value={{ enabled, setEnabled, open }}>
      {children}
      {word && (
        <div className="modal-backdrop" onClick={() => setWord(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Подсказка к слову"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setWord(null);
              }
              if (e.key === 'Tab') {
                const focus = [...e.currentTarget.querySelectorAll<HTMLElement>('button')];
                if (e.shiftKey && document.activeElement === focus[0]) {
                  e.preventDefault();
                  focus.at(-1)?.focus();
                } else if (!e.shiftKey && document.activeElement === focus.at(-1)) {
                  e.preventDefault();
                  focus[0]?.focus();
                }
              }
            }}
          >
            <button
              autoFocus
              className="close"
              onClick={() => setWord(null)}
              aria-label="Закрыть подсказку"
            >
              ×
            </button>
            <span className="eyebrow">Давай разберёмся</span>
            <h2>{word.en}</h2>
            <p className="ipa">{word.ipa}</p>
            <h3>{word.ru}</h3>
            <AudioButton text={word.en} />
            <p>{word.explanation}</p>
            <div className="example">
              {word.example}
              <AudioButton text={word.example} label="Пример" />
            </div>
            {word.sourceFormId && (
              <Link
                className="button"
                to={'/dictionary?source=workbook&form=' + word.sourceFormId}
                onClick={() => setWord(null)}
              >
                К основной словарной статье →
              </Link>
            )}
            <button
              className="button primary"
              onClick={() => {
                if (word.sourceFormId)
                  void useWorkbook.getState().update((p) => ({
                    ...p,
                    reviewIds: [...new Set([...p.reviewIds, word.sourceFormId!])],
                  }));
                else
                  void update((p) => ({
                    ...p,
                    reviewIds: [...new Set([...p.reviewIds, word.id])],
                  }));
                setAdded(true);
              }}
              disabled={added}
            >
              {added ? 'Добавлено ✓' : 'Добавить в повторение'}
            </button>
          </section>
        </div>
      )}
    </Context.Provider>
  );
}
function Token({ text, word }: { text: string; word: VocabularyItem }) {
  const { enabled, open } = useHints();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <span
      lang="en-GB"
      role={enabled ? 'button' : undefined}
      tabIndex={enabled ? 0 : undefined}
      className={enabled ? 'word-token active' : 'word-token'}
      onPointerDown={() => {
        long.current = false;
        timer.current = setTimeout(() => {
          long.current = true;
          open(word);
        }, 550);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => {
        e.preventDefault();
        open(word);
      }}
      onClick={(e) => {
        if (enabled || long.current) {
          e.stopPropagation();
          e.preventDefault();
          if (!long.current) open(word);
        }
      }}
      onKeyDown={(e) => {
        if (enabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          open(word);
        }
      }}
    >
      {text}
    </span>
  );
}
export function EnglishText({
  text,
  className = '',
  entries: supplied,
}: {
  text: string;
  className?: string;
  entries?: VocabularyItem[];
}) {
  // Longest phrase first: “school bag” and “pencil case” are single lexical units.
  const entries = [...(supplied || lexicon)].sort((a, b) => b.en.length - a.en.length);
  const pattern = new RegExp(
    `\\b(${entries.map((w) => w.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['’]")).join('|')})\\b`,
    'gi',
  );
  const parts = text.split(pattern);
  return (
    <span lang={/[а-яё]/i.test(text) ? 'ru' : 'en-GB'} className={className}>
      {parts.map((s, i) => {
        const word = entries.find(
          (w) => w.en.toLowerCase() === s.toLowerCase().replace(/[’‘]/g, "'"),
        );
        return word ? <Token key={i} text={s} word={word} /> : <span key={i}>{s}</span>;
      })}
    </span>
  );
}
export function HintToggle() {
  const { enabled, setEnabled } = useHints();
  return (
    <button
      className={`button hint-toggle ${enabled ? 'selected' : ''}`}
      aria-pressed={enabled}
      onClick={() => setEnabled(!enabled)}
    >
      {' '}
      ? <span>{enabled ? 'Нажми на слово' : 'Подсказки'}</span>
    </button>
  );
}
