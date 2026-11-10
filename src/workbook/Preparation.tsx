import { useEffect, useState } from 'react';
import { getSkill, getWordForm } from './index';
import { preparationPlan, recordWorkbookAttempt } from './learning';
import { WorkbookIllustration, WorkbookAudio, WorkbookText } from './components';
import { useWorkbook } from './store';
import type { WorkbookExercise } from './types';
export function Preparation({
  exercise,
  task,
  ids,
  onClose,
  slow = false,
}: {
  exercise: WorkbookExercise;
  task: number;
  ids: string[];
  onClose: () => void;
  slow?: boolean;
}) {
  const { progress, update } = useWorkbook();
  const [plan] = useState(() => {
    const p = preparationPlan(ids, progress);
    return p.length ? p : ids.filter((id) => !getSkill(id)?.planned);
  });
  const [skillIndex, setSkillIndex] = useState(0),
    [question, setQuestion] = useState(0),
    [answer, setAnswer] = useState(''),
    [result, setResult] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false);
  const skill = getSkill(plan[skillIndex]);
  useEffect(() => {
    const last = document.activeElement as HTMLElement;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      last?.focus();
    };
  }, [onClose]);
  if (!skill?.practice || !skill.example) return null;
  const q = skill.practice[question];
  async function check() {
    if (busy || result === true) return;
    setBusy(true);
    const correct = answer === q.answer;
    setResult(correct);
    await update((p) =>
      recordWorkbookAttempt(p, {
        exerciseId: exercise.id,
        task,
        correct,
        hinted: false,
        at: Date.now(),
        skillIds: [skill!.id],
        kind: 'preparation',
      }),
    );
    setBusy(false);
  }
  async function next() {
    if (question + 1 < skill!.practice!.length) {
      setQuestion(question + 1);
      setAnswer('');
      setResult(null);
      return;
    }
    await update((p) => ({
      ...p,
      preparations: { ...p.preparations, [skill!.id]: (p.preparations[skill!.id] || 0) + 1 },
    }));
    if (skillIndex + 1 < plan.length) {
      setSkillIndex(skillIndex + 1);
      setQuestion(0);
      setAnswer('');
      setResult(null);
    } else onClose();
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal wb-preparation"
        role="dialog"
        aria-modal="true"
        aria-label="Подготовка к заданию"
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            const focus = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input,select,a',
              ),
            ];
            if (e.shiftKey && document.activeElement === focus[0]) {
              e.preventDefault();
              focus.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === focus.at(-1)) {
              e.preventDefault();
              focus[0]?.focus();
            }
          }
        }}
      >
        <button className="close" autoFocus onClick={onClose} aria-label="Закрыть подготовку">
          ×
        </button>
        <span className="eyebrow">
          ШАГ {skillIndex + 1} / {plan.length} · ПОДГОТОВКА
        </span>
        <h2>{skill.title}</h2>
        <p>
          <WorkbookText text={skill.explanation!} />
        </p>
        <WorkbookAudio text={skill.explanation!} label="Слова правила" slow={slow} />
        <div className="wb-prerequisite-words">
          {exercise.wordIds.map((id) => {
            const w = getWordForm(id)!;
            return (
              <div key={id}>
                <WorkbookIllustration id={id} />
                <WorkbookText text={w.form} />
                <span> — {w.meanings[0].ru}</span>
                <WorkbookAudio text={w.form} label={w.form} slow={slow} />
              </div>
            );
          })}
        </div>
        <h3>Пример по шагам</h3>
        <ol>
          {skill.steps?.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="wb-example">
          <WorkbookText text={skill.example.en} />
          <p>{skill.example.ru}</p>
          <WorkbookAudio slow={slow} text={skill.example.en} />
        </div>
        <fieldset className="wb-quiz">
          <legend>
            Потренируйся · {question + 1} / {skill.practice.length}
          </legend>
          <WorkbookText text={q.prompt} />
          <WorkbookAudio text={q.prompt} label="Вопрос" slow={slow} />
          {q.options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="preparation"
                checked={answer === option}
                disabled={result === true}
                onChange={() => {
                  setAnswer(option);
                  if (result === false) setResult(null);
                }}
              />
              <WorkbookText text={option} />
            </label>
          ))}
        </fieldset>
        <div className="reader-controls">
          {q.options.map((option) => (
            <WorkbookAudio key={option} text={option} label={option} slow={slow} />
          ))}
        </div>
        <p role="status">
          {result === false
            ? 'Попробуй ещё раз. ' + q.why
            : result === true
              ? 'Верно! Можно двигаться дальше.'
              : ''}
        </p>
        <div className="reader-controls">
          {result === true ? (
            <button className="button primary" disabled={busy} onClick={() => void next()}>
              {question + 1 === skill.practice.length && skillIndex + 1 === plan.length
                ? 'Вернуться к заданию'
                : 'Дальше в подготовке'}
            </button>
          ) : (
            <button
              className="button primary"
              disabled={!answer || busy}
              onClick={() => void check()}
            >
              Проверить тренировку
            </button>
          )}
          <button className="button" onClick={onClose}>
            Уже понятно — к заданию
          </button>
        </div>
      </section>
    </div>
  );
}
