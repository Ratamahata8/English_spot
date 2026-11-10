import { useSearchParams } from 'react-router-dom';
import { useWorkbook } from './store';
import { EDITION_2017, EDITION_2026, editionFromQuery } from './editions';
export function EditionSelector({ edition }: { edition?: string }) {
  const [params, setParams] = useSearchParams();
  return (
    <label className="wb-edition-select">
      Издание сборника
      <select
        aria-label="Издание сборника"
        value={edition || editionFromQuery(params.get('edition'))}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set('edition', e.target.value);
          next.delete('form');
          setParams(next);
        }}
      >
        <option value={EDITION_2026}>17-е изд., 2026</option>
        <option value={EDITION_2017}>6-е изд., 2017</option>
      </select>
    </label>
  );
}
export function PendingEdition({ target }: { target: string }) {
  const { error, retry, initSource, saving, dirty } = useWorkbook();
  if (!dirty && !error) return <p role="status">Открываем издание…</p>;
  return (
    <section className="panel padding" role="alert">
      <p>{error || 'Сначала сохраним результат предыдущего издания.'}</p>
      <button
        className="button primary"
        disabled={saving > 0}
        onClick={async () => {
          if (await retry()) await initSource(target);
        }}
      >
        Сохранить и открыть издание
      </button>
    </section>
  );
}
