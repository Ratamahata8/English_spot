import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getLesson } from '../lessons';
import { EnglishText, HintToggle } from '../components/Hints';
import { AudioButton } from '../components/AudioButton';
import { useProgress } from '../stores/progress';
import { PageHeading } from '../components/PageHeading';
export function Basics() {
  const lesson = getLesson(useProgress((s) => s.progress.lessonId));
  const [topic, setTopic] = useState(
    new URLSearchParams(window.location.hash.split('?')[1]).get('topic') ||
      lesson.remedial.find((r) => r.available)!.id,
  );
  const [answer, setAnswer] = useState('');
  const [msg, setMsg] = useState('');
  const r =
    lesson.remedial.find((r) => r.id === topic && r.available) ||
    lesson.remedial.find((r) => r.available)!;
  return (
    <>
      <PageHeading
        eyebrow="Разбираемся без спешки"
        title="Маленькая база"
        description="Короткие объяснения к выбранному уроку."
      />
      <HintToggle />
      <div className="hint-tabs spaced">
        {lesson.remedial
          .filter((r) => r.available)
          .map((x) => (
            <button
              className={`button ${topic === x.id ? 'selected' : ''}`}
              key={x.id}
              onClick={() => {
                setTopic(x.id);
                setAnswer('');
                setMsg('');
              }}
            >
              {x.title}
            </button>
          ))}
      </div>
      <section className="panel padding">
        <h2>{r.title}</h2>
        <p>{r.explanation}</p>
        <EnglishText className="english-title" text={r.example} />
        <AudioButton text={r.example} />
        <h3>{r.question}</h3>
        <div className="options">
          {r.options.map((x) => (
            <button
              className={`option ${answer === x ? 'chosen' : ''}`}
              key={x}
              onClick={() => setAnswer(x)}
            >
              <EnglishText text={x} />
            </button>
          ))}
        </div>
        <button
          disabled={!answer}
          className="button primary"
          onClick={() =>
            setMsg(
              answer === r.answer
                ? 'Верно! Теперь попробуй применить это в уроке.'
                : 'Вспомни объяснение выше. Можно попробовать ещё.',
            )
          }
        >
          Проверить
        </button>
        <p role="status">{msg}</p>
        <Link className="button" to="/learn">
          Вернуться к уроку →
        </Link>
      </section>
      <div className="panel padding spaced">
        <h2>Полезные фразы</h2>
        {lesson.grammar.map((g) => (
          <div key={g.id}>
            <h3>{g.title}</h3>
            <p>{g.text}</p>
            {g.examples.map((s) => (
              <div className="phrase-row" key={s}>
                <EnglishText text={s} />
                <AudioButton text={s} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
