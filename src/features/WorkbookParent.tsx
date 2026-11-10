import { useSearchParams } from 'react-router-dom';
import { EditionSelector, PendingEdition } from '../workbook/EditionControls';
import { editionFromQuery, editionLabel } from '../workbook/editions';
import { exercisesForEdition } from '../workbook';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkbook } from '../workbook/store';
import { mastered } from '../workbook/learning';
import { getSkill, workbookExercises } from '../workbook';
export function WorkbookParent() {
  const [params] = useSearchParams();
  const edition = editionFromQuery(params.get('edition'));
  const { progress: p, initSource, ready } = useWorkbook();
  useEffect(() => {
    void initSource(edition);
  }, [initSource, edition]);
  const problems = Object.entries(p.grammar)
    .filter(([, k]) => (k.errors > 0 || k.hinted > 0) && (!mastered(k) || k.due <= Date.now()))
    .sort((a, b) => b[1].errors - a[1].errors);
  const days = [
    ...new Set(p.attempts.map((a) => new Date(a.at).toLocaleDateString('ru-RU'))),
  ].slice(-7);
  const weak = exercisesForEdition(edition).find((e) =>
    e.skillIds.some((id) => problems.some(([skill]) => skill === id)),
  );
  if (!ready) return <p role="status">Открываем статистику сборника…</p>;
  if (p.sourceId !== edition) return <PendingEdition target={edition} />;
  return (
    <section className="panel padding spaced wb-parent">
      <h2>Сборник: отдельная картина знаний · {editionLabel(edition)}</h2>
      <EditionSelector />
      <div className="parent-stats">
        {[
          [p.completed.length, `из ${exercisesForEdition(edition).length} тренировок выполнено`],
          [Object.values(p.words).filter(mastered).length, 'форм освоено самостоятельно'],
          [Math.floor(p.seconds / 60), 'минут в заданиях и подготовке'],
          [p.hintCount, 'обращений к помощи'],
        ].map(([n, title]) => (
          <div key={title}>
            <strong>{n}</strong>
            <p>{title}</p>
          </div>
        ))}
      </div>
      <p>
        Освоение слова или правила требует минимум трёх самостоятельных успешных проверок и серии из
        трёх. Подсказки и готовые шаблоны не дают самостоятельного успеха. Понимание предложений
        учитывается отдельно: {Object.values(p.meaning).filter(mastered).length} заданий.
      </p>
      <h3>Правила, к которым стоит вернуться</h3>
      {problems.length ? (
        problems.slice(0, 6).map(([id, k]) => (
          <p key={id}>
            {getSkill(id)?.title}: ошибок {k.errors}, с подсказкой {k.hinted}, самостоятельных
            успехов {k.independent}.
          </p>
        ))
      ) : (
        <p>Пока недостаточно данных. Дадим ребёнку попробовать задания.</p>
      )}
      <h3>Ошибки по дням</h3>
      {days.length ? (
        <table className="wb-data-table">
          <thead>
            <tr>
              <th>День</th>
              <th>Попыток</th>
              <th>Ошибок</th>
              <th>С опорой</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const attempts = p.attempts.filter(
                (a) => new Date(a.at).toLocaleDateString('ru-RU') === day,
              );
              return (
                <tr key={day}>
                  <td>{day}</td>
                  <td>{attempts.length}</td>
                  <td>{attempts.filter((a) => !a.correct).length}</td>
                  <td>{attempts.filter((a) => a.hinted).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>После занятий здесь появится динамика.</p>
      )}
      <h3>Что повторить сегодня</h3>
      <p>
        В ручной очереди слов: {p.reviewIds.length}. Пройденных подготовительных блоков:{' '}
        {Object.values(p.preparations).reduce((a, b) => a + b, 0)}.
      </p>
      <div className="reader-controls">
        <Link className="button" to={'/dictionary?source=workbook&edition=' + edition}>
          Повторить слова →
        </Link>
        <Link className="button" to={'/workbook/' + (weak?.id || p.currentId)}>
          Вернуться к теме →
        </Link>
      </div>
    </section>
  );
}
