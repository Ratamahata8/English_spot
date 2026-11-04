import { scenes } from '../textbook';
import { Link, useNavigate } from 'react-router-dom';
import { lessons } from '../lessons';
import { useProgress } from '../stores/progress';
import { initialProgress, percent } from '../services/learning';
import { Illustration } from '../components/Illustration';
import { PageHeading } from '../components/PageHeading';
export function Curriculum() {
  const { records, selectLesson } = useProgress();
  const navigate = useNavigate();
  const modules = [...new Set(lessons.map((l) => l.module))];
  async function start(id: string, restart: boolean) {
    if (
      restart &&
      !window.confirm(
        'Начать новый проход с первого задания? Статистика слов и число завершённых прохождений сохранятся.',
      )
    )
      return;
    await selectLesson(id, restart);
    navigate('/learn/' + id);
  }
  return (
    <>
      <PageHeading
        eyebrow="Spotlight 3 · часть 1"
        title="Мои уроки"
        description="Выбирай тему. Любой урок можно пройти ещё раз — столько, сколько нужно."
      />
      {modules.map((module) => (
        <section key={module} className="course-module">
          <h2>{module}</h2>
          <div className="course-grid">
            {lessons
              .filter((l) => l.module === module)
              .map((l) => {
                const p = records[l.id] || initialProgress(l.id);
                const runs = p.completedRuns ?? Number(p.lessonComplete);
                return (
                  <article className="panel course-card" key={l.id} data-lesson={l.id}>
                    <div className="course-card-top">
                      <span className="pill">{l.source}</span>
                      <span className="muted">Пройдено раз: {runs}</span>
                    </div>
                    <Illustration id={l.coverWordId} />
                    <h3>{l.title}</h3>
                    <p>{l.description}</p>
                    {scenes.some((s) => s.lessonIds.includes(l.id)) && (
                      <Link
                        className="textbook-lesson-link"
                        to={'/textbook/' + scenes.find((s) => s.lessonIds.includes(l.id))!.id}
                      >
                        Страница учебника с подсказками ↗
                      </Link>
                    )}
                    <small>
                      {l.vocabulary.length} слов · {l.exercises.length} заданий · 5 игр
                    </small>
                    <div className="progress-label">
                      <span>Текущий проход</span>
                      <strong>{percent(p)}%</strong>
                    </div>
                    <div className="track">
                      <i style={{ width: `${percent(p)}%` }} />
                    </div>
                    <div className="course-actions">
                      <button className="button primary" onClick={() => void start(l.id, false)}>
                        {p.lessonComplete
                          ? 'Результат'
                          : p.completed.length
                            ? 'Продолжить'
                            : 'Начать урок'}{' '}
                        →
                      </button>
                      <button className="button" onClick={() => void start(l.id, true)}>
                        {runs ? 'Пройти ещё раз' : 'Начать урок заново'}
                      </button>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
      <section className="panel padding spaced">
        <h2>Нужна маленькая база?</h2>
        <p>
          В каждом уроке есть объяснение его конструкции и мини-задание. Приложение предложит помощь
          после повторных ошибок.
        </p>
        <Link className="button" to="/basics">
          Открыть объяснения текущего урока →
        </Link>
      </section>
    </>
  );
}
