import { useEffect } from 'react';
import { HashRouter, NavLink, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Curriculum, Dictionary, Achievements, Parent, Basics } from '../features/Pages';
import { Learning, LessonRoute } from '../features/Learning';
import { HintsProvider } from '../components/Hints';
import { useProgress } from '../stores/progress';
const nav = [
  ['/', '⌂', 'Главная'],
  ['/curriculum', '▧', 'Мои уроки'],
  ['/dictionary', '▤', 'Словарь'],
  ['/achievements', '✦', 'Достижения'],
];
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function Shell() {
  const { progress, ready, error, init } = useProgress();
  useEffect(() => {
    void init();
  }, [init]);
  useEffect(() => {
    document.documentElement.dataset.motion = progress.settings.reduceMotion ? 'off' : 'on';
  }, [progress.settings.reduceMotion]);
  if (!ready) return <div className="loading">Открываем твой рюкзак…</div>;
  return (
    <HintsProvider>
      <ScrollReset />
      <a
        href="#main"
        className="skip"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        К содержимому
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span>
            e<span>•</span>
          </span>
          <div>
            english<span>spot</span>
          </div>
        </Link>
        <div className="sidebar-label">ТВОЁ ПРОСТРАНСТВО</div>
        <nav aria-label="Основная навигация">
          {nav.map(([to, icon, title]) => (
            <NavLink end={to === '/'} to={to} key={to}>
              <span aria-hidden="true">{icon}</span>
              {title}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <span>✧</span>
            <strong>Всё получится!</strong>
            <p>
              Даже 10 минут в день —<br />
              это шаг вперёд.
            </p>
          </div>
          <NavLink to="/parents" className="parent-link">
            <span>⚙</span> Для родителей
          </NavLink>
          <small>С интересом. Без спешки.</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Учимся с интересом <span className="small-star">✦</span>
          </span>
          <div>
            <span className="local-badge">◉ Прогресс на устройстве</span>
            <Link to="/parents" className="avatar" aria-label="Родительский кабинет">
              И
            </Link>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {error && (
            <div role="alert" className="notice">
              {error}
            </div>
          )}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/curriculum" element={<Curriculum />} />
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/parents" element={<Parent />} />
            <Route path="/learn" element={<Learning key={progress.lessonId} />} />
            <Route path="/learn/:lessonId" element={<LessonRoute />} />
            <Route path="/basics" element={<Basics />} />
            <Route
              path="*"
              element={
                <section className="panel padding">
                  <h1>Здесь пока ничего нет</h1>
                  <Link className="button primary" to="/">
                    На главную
                  </Link>
                </section>
              }
            />
          </Routes>
          <footer>
            ENGLISH SPOT <span>Маленькие открытия каждый день</span>
            <Link to="/parents">Родителям ↗</Link>
          </footer>
        </main>
      </div>
    </HintsProvider>
  );
}
export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
