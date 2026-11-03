import { useState } from 'react';
import { Link } from 'react-router-dom';
import { words, lexicon } from '../lessons';
import { useProgress } from '../stores/progress';
import { mastered } from '../services/learning';
import { PageHeading } from '../components/PageHeading';
export function Parent() {
  const { progress: p, update, reset, importData } = useProgress();
  const [message, setMessage] = useState('');
  const difficult = lexicon.filter(
    (w) => p.reviewIds.includes(w.id) || (p.stats[w.id]?.errors || 0) > 1,
  );
  const count = words.filter((w) => mastered(p.stats[w.id])).length;
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'english-spot-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeading
        eyebrow="Рядом с ребёнком"
        title="Родительский кабинет"
        description="Прогресс сохраняется только в этом браузере. Аккаунт не нужен."
      />
      <div className="parent-stats">
        {[
          [p.sessions, 'занятий'],
          [Math.round(p.seconds / 60), 'минут обучения'],
          [`${count} / 8`, 'слов освоено'],
          [p.hintCount, 'обращений к помощи'],
        ].map(([v, l]) => (
          <div className="panel" key={l}>
            <strong>{v}</strong>
            <p>{l}</p>
          </div>
        ))}
      </div>
      <div className="home-grid">
        <section className="panel padding">
          <h2>Что стоит повторить</h2>
          {difficult.length ? (
            <>
              <p>Лучше короткая спокойная тренировка, чем долгое занятие.</p>
              <div className="chips">
                {difficult.map((w) => (
                  <span className="pill" key={w.id}>
                    {w.en} · {p.stats[w.id]?.errors || 0} ошибок
                  </span>
                ))}
              </div>
              <Link className="button primary" to="/learn?review=1">
                Повторить ошибки →
              </Link>
            </>
          ) : (
            <p>Пока нет сложных слов. После первых ответов здесь появятся рекомендации.</p>
          )}
          <h3>Ошибки по темам</h3>
          {['this-is', 'my-your'].map((id) => (
            <p key={id}>
              {id === 'this-is' ? 'Порядок This is…' : 'Принадлежность my / your'}:{' '}
              {p.stats[id]?.errors || 0}
            </p>
          ))}
          <p className="muted">
            Слово считается освоенным после минимум трёх самостоятельных успехов. Интервалы
            повторения: 1, 3, 7 и 14 дней.
          </p>
        </section>
        <section className="panel padding">
          <h2>Сохранение и настройки</h2>
          <label className="setting">
            <input
              type="checkbox"
              checked={p.settings.slow}
              onChange={(e) =>
                void update((v) => ({ ...v, settings: { ...v.settings, slow: e.target.checked } }))
              }
            />{' '}
            Медленная озвучка · 0.75×
          </label>
          <label className="setting">
            <input
              type="checkbox"
              checked={p.settings.reduceMotion}
              onChange={(e) =>
                void update((v) => ({
                  ...v,
                  settings: { ...v.settings, reduceMotion: e.target.checked },
                }))
              }
            />{' '}
            Отключить анимации
          </label>
          <button className="button full" onClick={exportData}>
            ↓ Экспортировать прогресс
          </button>
          <label className="button full import-label">
            ↑ Импортировать JSON
            <input
              aria-label="Импортировать JSON"
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 2_000_000) throw Error('Слишком большой файл.');
                  const value = JSON.parse(await f.text());
                  if (window.confirm('Заменить текущий прогресс данными из файла?')) {
                    await importData(value);
                    setMessage('Прогресс восстановлен.');
                  }
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : 'Не удалось прочитать файл.');
                }
                e.target.value = '';
              }}
            />
          </label>
          <button
            className="quiet danger"
            onClick={async () => {
              if (
                window.confirm('Удалить весь прогресс? Перед удалением можно экспортировать его.')
              ) {
                try {
                  await reset();
                  setMessage('Прогресс сброшен.');
                } catch {
                  setMessage('Не удалось сбросить данные.');
                }
              }
            }}
          >
            Сбросить весь прогресс
          </button>
          <p role="status">{message}</p>
        </section>
      </div>
      <section className="panel padding spaced">
        <h2>Как устроена помощь</h2>
        <p>
          После повторных ошибок в предложении приложение предлагает короткий мини-урок. Не больше
          двух за одно занятие; можно вернуться к заданию сразу. Подсказки не штрафуют ребёнка.
        </p>
        <p>
          Всего попыток: {words.reduce((n, w) => n + (p.stats[w.id]?.attempts || 0), 0)}. Ошибок в
          словах: {words.reduce((n, w) => n + (p.stats[w.id]?.errors || 0), 0)}. Доля обращений к
          помощи:{' '}
          {p.hintCount
            ? Math.round(
                (p.hintCount /
                  Math.max(
                    1,
                    p.hintCount + words.reduce((n, w) => n + (p.stats[w.id]?.attempts || 0), 0),
                  )) *
                  100,
              )
            : 0}
          % от действий «ответ или помощь».
        </p>
      </section>
    </>
  );
}
