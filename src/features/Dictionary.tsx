import { useState } from 'react';
import { words } from '../lessons';
import { useProgress } from '../stores/progress';
import { mastered } from '../services/learning';
import { EnglishText, HintToggle } from '../components/Hints';
import { AudioButton } from '../components/AudioButton';
import { Illustration } from '../components/Illustration';
import { PageHeading } from '../components/PageHeading';
export function Dictionary() {
  const p = useProgress((s) => s.progress);
  const update = useProgress((s) => s.update);
  const [search, setSearch] = useState('');
  return (
    <>
      <PageHeading
        eyebrow="Слова в твоём рюкзаке"
        title="Мой словарь"
        description="Слушай, вспоминай и забирай слова на повторение."
      />
      <div className="toolbar">
        <label className="search">
          <span>⌕</span>
          <input
            aria-label="Найти слово"
            placeholder="Найти слово по-русски или по-английски"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <HintToggle />
      </div>
      <div className="dictionary-grid">
        {words
          .filter((w) => `${w.en} ${w.ru}`.toLowerCase().includes(search.toLowerCase().trim()))
          .map((w) => (
            <article key={w.id} className="word-card panel">
              <span className={`word-status ${mastered(p.stats[w.id]) ? 'done' : ''}`}>
                {mastered(p.stats[w.id])
                  ? '✓ Освоено'
                  : p.reviewIds.includes(w.id)
                    ? '↻ Повторить'
                    : 'Знакомимся'}
              </span>
              <Illustration id={w.id} />
              <EnglishText text={w.en} className="word-name" />
              <p className="ipa">{w.ipa}</p>
              <p>{w.ru}</p>
              <AudioButton text={w.en} />
              <EnglishText text={w.example} className="word-example" />
              <button
                className="quiet"
                disabled={p.reviewIds.includes(w.id)}
                onClick={() =>
                  void update((v) => ({ ...v, reviewIds: [...new Set([...v.reviewIds, w.id])] }))
                }
              >
                {p.reviewIds.includes(w.id) ? 'В повторении ✓' : '+ Добавить в повторение'}
              </button>
            </article>
          ))}
      </div>
      {!words.some((w) =>
        `${w.en} ${w.ru}`.toLowerCase().includes(search.toLowerCase().trim()),
      ) && <p className="empty">Такого слова пока нет. Попробуй другое.</p>}
    </>
  );
}
