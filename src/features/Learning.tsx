import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useParams } from 'react-router-dom';
import { getLesson, lessons } from '../lessons';
import { useProgress } from '../stores/progress';
import { completeExercise, reviewWords, reviewExercise } from '../services/learning';
import { HintToggle } from '../components/Hints';
import { stopAudio } from '../services/audio';
import { ExerciseCard } from './ExerciseCard';
export function Learning() {
  const { progress: p, update } = useProgress();
  const lesson = getLesson(p.lessonId);
  const [params] = useSearchParams();
  const review = params.has('review');
  const [reviewQueue] = useState(() => reviewWords(p, params.has('errors')).map((w) => w.id));
  const [reviewIndex, setReviewIndex] = useState(0);
  const base = lesson.exercises.find((e) => e.id === p.currentExerciseId);
  const word = reviewQueue[reviewIndex];
  const e = review ? (word ? reviewExercise(word) : undefined) : base;
  const finished = (review && reviewIndex >= reviewQueue.length) || (!review && !e);
  const active = !finished && !!e;
  const entered = useRef(false);
  useEffect(() => {
    if (!active) {
      entered.current = false;
      return;
    }
    if (!entered.current) {
      entered.current = true;
      void update(
        (v) => ({ ...v, sessions: v.sessions + 1, remedialCount: 0, remedialDone: [] }),
        p.lessonId,
      );
    }
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      const delta = Math.floor((now - last) / 1000);
      if (delta > 0) {
        last += delta * 1000;
        void update((v) => ({ ...v, seconds: v.seconds + delta }), p.lessonId);
      }
    };
    const timer = setInterval(flush, 10000);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', flush);
      stopAudio();
      flush();
    };
  }, [active, update, p.lessonId]);
  if (finished)
    return (
      <section className="finish panel">
        <span className="finish-star">✦</span>
        <h1>{review ? 'Повторение завершено!' : 'Урок пройден!'}</h1>
        <p>
          {review
            ? reviewQueue.length
              ? 'Ты ещё раз потренировал знакомые слова.'
              : 'Сейчас нет слов для повторения. Можно добавить их в словаре.'
            : `Ты потренировал слова и предложения урока «${lesson.title}». Пройдено раз: ${p.completedRuns ?? 1}.`}
        </p>
        {!review && (
          <button
            className="button primary"
            onClick={() => void useProgress.getState().selectLesson(p.lessonId, true)}
          >
            Пройти ещё раз →
          </button>
        )}
        <Link className="button" to="/curriculum">
          Выбрать другой урок
        </Link>
        <Link className="button primary" to="/">
          На главную
        </Link>
        <Link className="button" to="/dictionary">
          Открыть словарь
        </Link>
      </section>
    );
  if (!e) return null;
  const index = review ? reviewIndex : p.completed.length;
  const total = review ? reviewQueue.length : lesson.exercises.length;
  return (
    <div className="lesson-shell">
      <div className="lesson-top">
        <Link to="/curriculum" className="quiet">
          ← К урокам
        </Link>
        <span>{review ? 'Повторение слов' : lesson.title}</span>
        <HintToggle />
      </div>
      <div className="progress-line">
        <div className="track">
          <i style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span>
          {index + 1} / {total}
        </span>
      </div>
      <ExerciseCard
        key={e.id}
        exercise={e}
        onNext={async () => {
          if (review) {
            setReviewIndex((i) => i + 1);
          } else await update((v) => completeExercise(v, e));
        }}
        review={review}
      />
    </div>
  );
}

export function LessonRoute() {
  const { lessonId } = useParams();
  const { progress, selectLesson } = useProgress();
  const valid = lessons.some((l) => l.id === lessonId);
  useEffect(() => {
    if (valid && lessonId && progress.lessonId !== lessonId) void selectLesson(lessonId);
  }, [lessonId, progress.lessonId, selectLesson, valid]);
  if (!valid)
    return (
      <section className="panel padding">
        <h1>Такого урока нет</h1>
        <Link to="/curriculum">К программе</Link>
      </section>
    );
  if (progress.lessonId !== lessonId) return <p>Открываем урок…</p>;
  return <Learning key={lessonId} />;
}
