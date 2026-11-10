import { words as legacyWords } from '../lessons';
import { Illustration } from '../components/Illustration';
import { useProgress } from '../stores/progress';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { EnglishText, useHints } from '../components/Hints';
import { getWordForm, englishSegments, allWorkbookWords, contextualMeaning } from './index';
import { useWorkbook } from './store';
import { playWorkbookClip, stopAudio } from '../services/audio';
import type { VocabularyItem } from '../types';
export function workbookHints(context: string): VocabularyItem[] {
  return allWorkbookWords.map((w) => ({
    id: w.id,
    en: w.form,
    ru: contextualMeaning(w, context).ru,
    ipa: `/${w.ipa}/`,
    explanation:
      contextualMeaning(w, context).context +
      '. ' +
      w.grammar +
      (w.occurrences.some((o) => o.sourceId === useWorkbook.getState().progress.sourceId)
        ? ' Слово встречается в выбранном издании сборника.'
        : ' Дополнительное слово для объяснения; источник указан в словаре.'),
    example: w.example.en,
    image: '',
    sourceFormId: w.id,
    sourceEditionId:
      w.occurrences.find((o) => o.sourceId === useWorkbook.getState().progress.sourceId)
        ?.sourceId || w.occurrences[0]?.sourceId,
  }));
}
export function WorkbookText({ text, className = '' }: { text: string; className?: string }) {
  return <EnglishText text={text} className={className} entries={workbookHints(text)} />;
}
export function WorkbookAudio({
  text,
  label = 'Послушать',
  slow: providedSlow,
}: {
  text: string | string[];
  label?: string;
  slow?: boolean;
}) {
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState('');
  const token = useRef(0),
    live = useRef(false);
  const preferredSlow = useProgress((s) => s.progress.settings.slow);
  const slow = providedSlow ?? preferredSlow;
  useEffect(
    () => () => {
      token.current++;
      if (live.current) stopAudio();
    },
    [],
  );
  async function listen() {
    if (live.current) {
      token.current++;
      stopAudio();
      live.current = false;
      setPlaying(false);
      return;
    }
    const id = ++token.current;
    live.current = true;
    setPlaying(true);
    setError('');
    try {
      for (const segment of (Array.isArray(text) ? text : [text]).flatMap(englishSegments)) {
        if (id !== token.current) return;
        if (!(await playWorkbookClip(segment, slow))) return;
      }
    } catch {
      if (id === token.current)
        setError('Не удалось воспроизвести. Проверь подключение и повтори.');
    } finally {
      if (id === token.current) {
        live.current = false;
        setPlaying(false);
      }
    }
  }
  if (!(Array.isArray(text) ? text : [text]).flatMap(englishSegments).length) return null;
  return (
    <span className="wb-audio">
      <button className="button" type="button" aria-pressed={playing} onClick={() => void listen()}>
        {playing ? '■ Стоп' : `♫ ${label}`}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
export function FormReviewButton({ id }: { id: string }) {
  const { progress, update } = useWorkbook();
  const added = progress.reviewIds.includes(id);
  return (
    <button
      className="button"
      disabled={added}
      onClick={() => void update((p) => ({ ...p, reviewIds: [...new Set([...p.reviewIds, id])] }))}
    >
      {added ? 'В повторении ✓' : '+ В повторение'}
    </button>
  );
}
export function SourceDictionaryLink({ id }: { id: string }) {
  const { setEnabled } = useHints();
  return (
    <Link
      className="button"
      to={`/dictionary?source=workbook&form=${id}&edition=${getWordForm(id)?.occurrences.find((o) => o.sourceId === useWorkbook.getState().progress.sourceId)?.sourceId || getWordForm(id)?.occurrences[0]?.sourceId}`}
      onClick={() => setEnabled(false)}
    >
      Словарная статья →
    </Link>
  );
}

export function WorkbookIllustration({ id }: { id: string }) {
  const form = allWorkbookWords.find((w) => w.id === id);
  const legacy = legacyWords.find((w) => w.en.toLowerCase() === form?.lemma.toLowerCase());
  if (!form || !legacy) return null;
  const plural =
    form.partOfSpeech === 'существительное' && form.form.toLowerCase() !== form.lemma.toLowerCase();
  return (
    <span className="wb-word-picture" aria-label={plural ? 'Несколько предметов' : 'Один предмет'}>
      <Illustration id={legacy.id} />
      {plural && <Illustration id={legacy.id} />}
    </span>
  );
}
