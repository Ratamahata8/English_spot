import { useWorkbook } from '../workbook/store';
import { WorkbookParent } from './WorkbookParent';
import { workbookRepository, readerRepository } from '../services/storage';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { words, lexicon, lessons } from '../lessons';
import { useProgress } from '../stores/progress';
import { summarize } from '../services/learning';
import { PageHeading } from '../components/PageHeading';
export function Parent() {
  const {
    progress: p,
    records,
    update,
    reset,
    importData,
    exportData: buildExport,
  } = useProgress();
  const [message, setMessage] = useState('');
  const summary = summarize(records);
  const difficult = lexicon.filter(
    (w) =>
      Object.values(records).some((v) => v.reviewIds.includes(w.id)) ||
      (summary.stats[w.id]?.errors || 0) > 1,
  );
  const count = summary.learned;
  async function exportData() {
    try {
      await useWorkbook.getState().flush();
      const bundle = {
        ...buildExport(),
        reader: await readerRepository.loadAll(),
        workbook: await workbookRepository.loadAll(),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'english-spot-progress.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage('Не удалось подготовить резервную копию. Проверь доступ к хранилищу и повтори.');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Рядом с ребёнком"
        title="Родительский кабинет"
        description="Прогресс хранится в IndexedDB этого браузера. Это не обычный кеш: закрытие вкладки его не удаляет. Экспорт включает уроки, отметки реплик, сохранённые фразы и весь прогресс сборника. Сделайте копию перед очисткой данных сайта."
      />
      <div className="parent-stats">
        {[
          [summary.sessions, 'занятий'],
          [Math.round(summary.seconds / 60), 'минут обучения'],
          [`${count} / ${words.length}`, 'слов освоено'],
          [summary.hintCount, 'обращений к помощи'],
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
                    {w.en} · {summary.stats[w.id]?.errors || 0} ошибок
                  </span>
                ))}
              </div>
              <Link
                className="button primary"
                to={
                  '/learn/' +
                  (Object.values(records).find(
                    (v) => v.reviewIds.length || Object.values(v.stats).some((s) => s.errors > 1),
                  )?.lessonId || p.lessonId) +
                  '?review=1&errors=1'
                }
              >
                Повторить ошибки →
              </Link>
            </>
          ) : (
            <p>Пока нет сложных слов. После первых ответов здесь появятся рекомендации.</p>
          )}
          <h3>Ошибки по темам</h3>
          {[...new Set(lessons.flatMap((l) => l.grammar.map((g) => g.id)))].map((id) => (
            <p key={id}>
              {lessons.flatMap((l) => l.grammar).find((g) => g.id === id)?.title || id}:{' '}
              {summary.stats[id]?.errors || 0}
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
                    await useWorkbook
                      .getState()
                      .flush()
                      .catch(() => {});
                    await importData(value);
                    await useWorkbook.getState().init(true);
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
                  await useWorkbook
                    .getState()
                    .flush()
                    .catch(() => {});
                  await reset();
                  await useWorkbook.getState().init(true);
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
      <WorkbookParent />
      <section className="panel padding spaced">
        <h2>Как устроена помощь</h2>
        <p>
          Пройдено тем: {summary.completed} из {lessons.length}. Завершённых прохождений, включая
          повторные: {summary.runs}.
        </p>
        <p>
          После повторных ошибок в предложении приложение предлагает короткий мини-урок. Не больше
          двух за одно занятие; можно вернуться к заданию сразу. Подсказки не штрафуют ребёнка.
        </p>
        <p>
          Всего попыток: {words.reduce((n, w) => n + (summary.stats[w.id]?.attempts || 0), 0)}.
          Ошибок в словах: {words.reduce((n, w) => n + (summary.stats[w.id]?.errors || 0), 0)}. Доля
          обращений к помощи:{' '}
          {summary.hintCount
            ? Math.round(
                (summary.hintCount /
                  Math.max(
                    1,
                    summary.hintCount +
                      words.reduce((n, w) => n + (summary.stats[w.id]?.attempts || 0), 0),
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
