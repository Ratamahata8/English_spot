import { Link } from 'react-router-dom';
import { words } from '../lessons';
import { useProgress } from '../stores/progress';
import { percent, mastered, dueWords } from '../services/learning';
import { Illustration } from '../components/Illustration';
import { audioAvailable } from '../services/audio';
const BASE = import.meta.env.BASE_URL;
export function Home() {
  const p = useProgress((s) => s.progress);
  const learned = words.filter((w) => mastered(p.stats[w.id])).length;
  const due = dueWords(p).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Маленькие шаги — большие открытия</span>
          <h1>
            Привет, исследователь! <span className="wave">✺</span>
          </h1>
          <p>Немного английского. Много интересного.</p>
        </div>
        <span className="date-chip">Spotlight 3 · 3 класс</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">ТВОЁ ПРИКЛЮЧЕНИЕ НАЧИНАЕТСЯ</span>
          <h2>
            В школу
            <br />с новыми словами!
          </h2>
          <p>
            Знакомься со Спотти, слушай английский
            <br className="desktop" /> и собирай свои первые предложения.
          </p>
          <Link className="button primary" to="/learn">
            {p.completed.length ? 'Продолжить обучение' : 'Начать обучение'} <span>→</span>
          </Link>
          <span className="hero-caption">Без спешки. В своём темпе.</span>
        </div>
        <div className="hero-art">
          <span className="spark spark-one">✧</span>
          <span className="speech-bubble">
            Привет, друг!<span>Давай учиться вместе</span>
          </span>
          <img
            src={BASE + 'illustrations/spotty.svg'}
            alt="Спотти — твой друг в изучении английского"
          />
          <img className="hero-pencil" src={BASE + 'illustrations/pencil.svg'} alt="" />
          <span className="spark spark-two">✳</span>
          <div className="spotty-caption">СПОТТИ · ВСЕГДА РЯДОМ</div>
        </div>
      </section>
      {!audioAvailable && (
        <div className="notice" role="status">
          <strong>Озвучка пока не готова.</strong> Учебные MP3 ещё не сгенерированы: доступ к
          сервису речи заблокирован сетью среды. Уроки доступны для проверки интерфейса; полноценное
          обучение требует аудио.
        </div>
      )}
      <section className="stats-strip" aria-label="Твой прогресс">
        <div>
          <span className="stat-icon sage">▧</span>
          <p>
            <strong>
              {learned} <small>из 8</small>
            </strong>
            <span>слов освоено</span>
          </p>
        </div>
        <div>
          <span className="stat-icon peach">⚑</span>
          <p>
            <strong>{p.lessonComplete ? 1 : 0}</strong>
            <span>уроков пройдено</span>
          </p>
        </div>
        <div>
          <span className="stat-icon lavender">✦</span>
          <p>
            <strong>{p.successful}</strong>
            <span>успешных ответов</span>
          </p>
        </div>
        <div>
          <span className="stat-icon yellow">◷</span>
          <p>
            <strong>
              {Math.floor(p.seconds / 60)} <small>мин</small>
            </strong>
            <span>время с английским</span>
          </p>
        </div>
      </section>
      <div className="section-heading">
        <h2>Твоя дорожка знаний</h2>
        <Link to="/curriculum">
          Все уроки <span>↗</span>
        </Link>
      </div>
      <div className="home-grid">
        <section className="lesson-preview panel">
          <div className="preview-top">
            <span className="pill">УРОК 1 · ДОСТУПЕН</span>
            <span className="muted">8 слов · 5 игр</span>
          </div>
          <div className="preview-content">
            <div className="bag-tile">
              <Illustration id="school-bag" />
            </div>
            <div>
              <span className="eyebrow">Школьные принадлежности</span>
              <h3>School Again!</h3>
              <p>Снова в школу — теперь по-английски</p>
            </div>
          </div>
          <div className="progress-label">
            <span>Твой прогресс</span>
            <strong>{percent(p)}%</strong>
          </div>
          <div className="track">
            <i style={{ width: `${percent(p)}%` }} />
          </div>
          <Link className="button pale full" to="/learn">
            {p.lessonComplete ? 'Посмотреть результат' : 'Продолжить урок'} →
          </Link>
        </section>
        <section className="review-preview panel">
          <span className="round-illustration">↻</span>
          <h3>
            Знакомые слова
            <br />
            тоже любят внимание
          </h3>
          <p>
            {due
              ? `${due} слов ждут повторения. Закрепим их вместе?`
              : 'Короткое повторение помогает помнить дольше.'}
          </p>
          <Link className="button" to="/learn?review=1">
            Повторить слова →
          </Link>
        </section>
      </div>
      <section className="tip">
        <span>✧</span>
        <div>
          <strong>Секрет Спотти</strong>
          <p>Не знаешь слово? Нажми на знак вопроса в уроке. Я помогу!</p>
        </div>
        <span className="tip-dots">···</span>
      </section>
    </>
  );
}
