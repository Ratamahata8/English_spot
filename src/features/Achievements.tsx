import { lesson, words } from '../lessons';
import { useProgress } from '../stores/progress';
import { percent, mastered } from '../services/learning';
import { PageHeading } from '../components/PageHeading';
export function Achievements() {
  const p = useProgress((s) => s.progress);
  const count = words.filter((w) => mastered(p.stats[w.id])).length;
  const badges = [
    {
      icon: '✦',
      title: 'Первый шаг',
      text: 'Заверши первое задание',
      done: p.completed.length > 0,
    },
    {
      icon: '♫',
      title: 'Восемь открытий',
      text: 'Познакомься со всеми словами',
      done: lesson.exercises
        .filter((e) => e.type === 'study')
        .every((e) => p.completed.includes(e.id)),
    },
    { icon: '⚑', title: 'Снова в школу', text: 'Пройди первый урок', done: p.lessonComplete },
    { icon: '✺', title: 'Слова с тобой', text: 'Освой все восемь слов', done: count === 8 },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Каждый шаг имеет значение"
        title="Мои достижения"
        description="Мы ценим старание. Ты учишься, когда пробуешь!"
      />
      <div className="achievement-summary panel">
        <strong>{percent(p)}%</strong>
        <div>
          <h2>Твоего первого приключения</h2>
          <p>
            {count} освоенных слов · {p.lessonComplete ? 1 : 0} пройденных уроков · {p.successful}{' '}
            успешных упражнений
          </p>
        </div>
      </div>
      <div className="badge-grid">
        {badges.map((b) => (
          <article className={`panel badge ${b.done ? 'earned' : ''}`} key={b.title}>
            <span>{b.icon}</span>
            <h3>{b.title}</h3>
            <p>{b.text}</p>
            <small>{b.done ? 'Получено ✓' : 'Ещё впереди'}</small>
          </article>
        ))}
      </div>
    </>
  );
}
