import { lesson, lessons, words } from '../lessons';
import { useProgress } from '../stores/progress';
import { percent, summarize } from '../services/learning';
import { PageHeading } from '../components/PageHeading';
export function Achievements() {
  const p = useProgress((s) => s.progress);
  const records = useProgress((s) => s.records);
  const summary = summarize(records);
  const count = summary.learned;
  const first = records[lesson.id];
  const badges = [
    {
      icon: '✦',
      title: 'Первый шаг',
      text: 'Заверши первое задание',
      done: Object.values(records).some((v) => v.completed.length > 0 || v.completedRuns),
    },
    {
      icon: '♫',
      title: 'Восемь открытий',
      text: 'Познакомься со всеми словами',
      done: lesson.exercises
        .filter((e) => e.type === 'study')
        .every((e) => first?.completed.includes(e.id)),
    },
    {
      icon: '⚑',
      title: 'Снова в школу',
      text: 'Пройди первый урок',
      done: (first?.completedRuns ?? Number(first?.lessonComplete)) > 0,
    },
    {
      icon: '✺',
      title: 'Слова с тобой',
      text: 'Освой слова всех тем',
      done: count === words.length,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Каждый шаг имеет значение"
        title="Мои достижения"
        description="Мы ценим старание. Ты учишься, когда пробуешь!"
      />
      <div className="achievement-summary panel">
        <strong>{Math.round((summary.completed / lessons.length) * 100)}%</strong>
        <div>
          <h2>Учебной программы</h2>
          <p>
            {count} освоенных слов · {summary.completed} пройденных уроков · {summary.successful}{' '}
            успешных упражнений · {summary.runs} завершённых прохождений
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
