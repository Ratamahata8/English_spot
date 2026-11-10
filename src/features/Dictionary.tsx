import { editionFromQuery } from '../workbook/editions';
import { useSearchParams, Link } from 'react-router-dom';
import { WorkbookDictionary } from './WorkbookDictionary';
import { useState } from 'react';
import { words, lessons } from '../lessons';
import { useProgress } from '../stores/progress';
import { mastered, summarize } from '../services/learning';
import { EnglishText, HintToggle } from '../components/Hints';
import { AudioButton } from '../components/AudioButton';
import { Illustration } from '../components/Illustration';
import { PageHeading } from '../components/PageHeading';
export function Dictionary() {
  const [params] = useSearchParams();
  const source = params.get('source') !== 'lessons';
  return (
    <>
      <div className="reader-controls wb-dictionary-switch">
        <Link
          className="button"
          aria-current={!source ? 'page' : undefined}
          to="/dictionary?source=lessons"
        >
          Словарь моих уроков
        </Link>
        <Link
          className="button"
          aria-current={source ? 'page' : undefined}
          to="/dictionary?source=workbook"
        >
          Словарь сборника
        </Link>
      </div>
      {source ? (
        <WorkbookDictionary key={params.get('edition') || params.get('form') || 'default-2026'} />
      ) : (
        <LegacyDictionary />
      )}
    </>
  );
}
function LegacyDictionary() {
  const p = useProgress((s) => s.progress);
  const update = useProgress((s) => s.update);
  const summary = summarize(useProgress((s) => s.records));
  const [filter, setFilter] = useState('all');
  const visibleWords = filter === 'all' ? words : lessons.find((l) => l.id === filter)!.vocabulary;
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
      <label className="dictionary-filter">
        Тема:{' '}
        <select
          aria-label="Тема словаря"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Все темы · {words.length} слов</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <div className="dictionary-grid">
        {visibleWords
          .filter((w) => `${w.en} ${w.ru}`.toLowerCase().includes(search.toLowerCase().trim()))
          .map((w) => (
            <article key={w.id} className="word-card panel">
              <span className={`word-status ${mastered(summary.stats[w.id]) ? 'done' : ''}`}>
                {mastered(summary.stats[w.id])
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
      {!visibleWords.some((w) =>
        `${w.en} ${w.ru}`.toLowerCase().includes(search.toLowerCase().trim()),
      ) && <p className="empty">Такого слова пока нет. Попробуй другое.</p>}
    </>
  );
}
