import { useState } from 'react';
import { getLesson, byId } from '../lessons';
import type { Exercise } from '../types';
import { useProgress } from '../stores/progress';
import { AudioButton } from './AudioButton';
import { EnglishText } from './Hints';
export function LegacyPreparation({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  const p = useProgress((s) => s.progress),
    lesson = getLesson(p.lessonId),
    word = byId(exercise.wordId),
    other = lesson.vocabulary.find((w) => w.id !== word.id) || lesson.vocabulary[0];
  const [step, setStep] = useState(0),
    [selected, setSelected] = useState(''),
    [correct, setCorrect] = useState<boolean | null>(null);
  const questions = [
    { prompt: 'Выбери значение: ' + word.en, options: [word.ru, other.ru], answer: word.ru },
    {
      prompt: 'Выбери пример про ' + word.ru + '.',
      options: [other.example, word.example],
      answer: word.example,
    },
  ];
  const q = questions[step];
  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Подготовка к заданию"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Tab') {
            const list = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled)',
              ),
            ];
            if (e.shiftKey && document.activeElement === list[0]) {
              e.preventDefault();
              list.at(-1)?.focus();
            } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
              e.preventDefault();
              list[0]?.focus();
            }
          }
        }}
      >
        <button className="close" autoFocus onClick={onClose} aria-label="Закрыть подготовку">
          ×
        </button>
        <h2>Подготовимся спокойно</h2>
        <p>{exercise.hint.explanation}</p>
        <h3>Нужные слова</h3>
        {[word, other].map((w) => (
          <div className="wb-example" key={w.id}>
            <EnglishText text={w.en} /> — {w.ru}
            <AudioButton text={w.en} />
            <p>{w.explanation}</p>
          </div>
        ))}
        <h3>Пример по шагам</h3>
        <ol>
          {exercise.hint.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <EnglishText text={word.example} />
        <AudioButton text={word.example} label="Пример" />
        {lesson.grammar[0] && <p>{lesson.grammar[0].text}</p>}
        <fieldset className="wb-quiz">
          <legend>
            {step + 1} / 2 · {q.prompt}
          </legend>
          {q.options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="legacy-preparation"
                checked={selected === option}
                onChange={() => {
                  setSelected(option);
                  setCorrect(null);
                }}
              />
              <EnglishText text={option} />
            </label>
          ))}
        </fieldset>
        <p role="status">
          {correct === null
            ? ''
            : correct
              ? 'Верно!'
              : 'Посмотри на объяснение и попробуй ещё раз.'}
        </p>
        {correct ? (
          <button
            className="button primary"
            onClick={() => {
              if (step === 1) onClose();
              else {
                setStep(1);
                setSelected('');
                setCorrect(null);
              }
            }}
          >
            {step === 1 ? 'Вернуться к заданию' : 'Следующий тренировочный вопрос'}
          </button>
        ) : (
          <button
            className="button primary"
            disabled={!selected}
            onClick={() => setCorrect(selected === q.answer)}
          >
            Проверить тренировку
          </button>
        )}
        <button className="button" onClick={onClose}>
          Уже понятно — к заданию
        </button>
      </section>
    </div>
  );
}
