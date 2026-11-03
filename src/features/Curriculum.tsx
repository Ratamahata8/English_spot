import { Link } from 'react-router-dom';
import { lesson } from '../lessons';
import { useProgress } from '../stores/progress';
import { percent } from '../services/learning';
import { Illustration } from '../components/Illustration';
import { PageHeading } from '../components/PageHeading';
export function Curriculum() {
  const { progress: p, update } = useProgress();
  return (
    <>
      <PageHeading
        eyebrow="Твоя программа"
        title="Мои уроки"
        description="Один небольшой шаг каждый день."
      />
      <section className="panel curriculum-card">
        <div>
          <span className="pill">SPOTLIGHT 3 · ЧАСТЬ 1</span>
          <h2>School Again!</h2>
          <p>Восемь школьных слов, вопросы о предметах и первые предложения.</p>
          <p className="muted">Unit 1a · цели страницы 10 · самостоятельные упражнения</p>
          <div className="track">
            <i style={{ width: `${percent(p)}%` }} />
          </div>
          <p>
            {percent(p)}% урока · {p.completed.length} из {lesson.exercises.length} заданий
          </p>
          <Link className="button primary" to="/learn">
            {p.lessonComplete ? 'Результат' : 'Продолжить'} →
          </Link>
          <button
            className="button"
            onClick={() => {
              if (
                window.confirm('Начать этот урок заново? Статистика слов и повторения сохранятся.')
              )
                void update((v) => ({
                  ...v,
                  currentExerciseId: lesson.exercises[0].id,
                  completed: [],
                  lessonComplete: false,
                  remedialCount: 0,
                  remedialDone: [],
                }));
            }}
          >
            Начать урок заново
          </button>
        </div>
        <Illustration id="school" />
      </section>
      <div className="section-heading">
        <h2>База, которая поможет</h2>
        <Link to="/basics">Открыть мини-уроки →</Link>
      </div>
      <div className="mini-grid">
        {lesson.remedial.map((r) => (
          <div className="panel" key={r.id}>
            <span className="eyebrow">{r.available ? 'Можно потренироваться' : 'Скоро'}</span>
            <h3>{r.title}</h3>
            {r.available ? (
              <Link className="button" to={`/basics?topic=${r.id}`}>
                Разобраться →
              </Link>
            ) : (
              <p className="muted">Готовим следующий мини-урок</p>
            )}
          </div>
        ))}
      </div>
      <h2 className="spaced">Дальше — больше открытий</h2>
      {['School subjects', 'My family', 'All the things I like!'].map((s, i) => (
        <div className="future" key={s}>
          <span className="lock">◇</span>
          <div>
            <strong>
              Урок {i + 2} · {s}
            </strong>
            <p>Будущий урок · пока недоступен</p>
          </div>
        </div>
      ))}
    </>
  );
}
