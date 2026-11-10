import { useState } from 'react';
import type { Task, Answer } from './types';
import { findWord } from './learning';
import { WorkbookText, WorkbookAudio } from './components';
export function TaskRenderer({
  task,
  answer,
  onChange,
  disabled,
  slow = false,
}: {
  task: Task;
  answer: Answer;
  onChange: (a: Answer) => void;
  disabled: boolean;
  slow?: boolean;
}) {
  const [start, setStart] = useState<number[] | null>(null),
    [gridMessage, setGridMessage] = useState(''),
    [zoom, setZoom] = useState(false);
  const [coords, setCoords] = useState(['1', '1', '1', '1']);
  const updateValue = (i: number, value: string) => {
    const values = [...(answer.values || [])];
    values[i] = value;
    onChange({ ...answer, values });
  };
  function search(from: number[], to: number[]) {
    const word = findWord(task, from, to);
    if (word) {
      onChange({ ...answer, found: [...new Set([...(answer.found || []), word])] });
      setGridMessage('Найдено: ' + word);
    } else setGridMessage('Между этими клетками нет нужного слова. Попробуй ещё раз.');
    setStart(null);
  }
  if (task.mode === 'text')
    return (
      <label className="wb-input">
        Твой ответ
        <input
          aria-label="Твой ответ"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          lang="en-GB"
          value={answer.text || ''}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>
    );
  if (task.mode === 'choice')
    return (
      <fieldset className="wb-choices">
        <legend className="sr-only">Варианты ответа</legend>
        {task.options!.map((option) => (
          <div className="wb-choice" key={option}>
            <label>
              <input
                name="wb-choice"
                type="radio"
                disabled={disabled}
                checked={answer.text === option}
                onChange={() => onChange({ text: option })}
              />
              <WorkbookText text={option} />
            </label>
            <WorkbookAudio text={option} label={option} slow={slow} />
          </div>
        ))}
      </fieldset>
    );
  if (task.mode === 'order')
    return (
      <div className="wb-order">
        <div className="wb-answer-tray" aria-label="Собранный ответ">
          {answer.order?.map((id, i) => (
            <button
              className="button"
              key={i}
              disabled={disabled}
              onClick={() => onChange({ order: answer.order!.filter((_, n) => n !== i) })}
            >
              <WorkbookText text={task.tokens![id]} />
              <span aria-hidden="true"> ×</span>
            </button>
          ))}
        </div>
        <div className="wb-token-bank" aria-label="Части для сборки">
          {task.tokens!.map((token, id) => (
            <button
              className="button"
              key={id}
              disabled={disabled || answer.order?.includes(id)}
              onClick={() => onChange({ order: [...(answer.order || []), id] })}
            >
              <WorkbookText text={token} />
            </button>
          ))}
        </div>
        <button className="quiet" disabled={disabled} onClick={() => onChange({ order: [] })}>
          Начать сборку заново
        </button>
      </div>
    );
  if (task.mode === 'matching')
    return (
      <div className="wb-matching">
        {task.rows!.map((row, i) => (
          <div className="wb-match-row" key={i}>
            <div>
              <WorkbookText text={row.label} />
              <WorkbookAudio text={row.label} label={row.label} slow={slow} />
            </div>
            <label>
              <span className="sr-only">Пара {i + 1}</span>
              <select
                aria-label={'Пара ' + (i + 1)}
                disabled={disabled}
                value={answer.values?.[i] || ''}
                onChange={(e) => updateValue(i, e.target.value)}
              >
                <option value="">Выбери пару</option>
                {task.options!.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {answer.values?.[i] && <WorkbookAudio text={answer.values[i]} slow={slow} />}
          </div>
        ))}
      </div>
    );
  if (task.mode === 'template')
    return (
      <div className="wb-template">
        {task.slots!.map((slot, i) => (
          <div key={i}>
            <label>
              {slot.label}
              <select
                aria-label={slot.label}
                disabled={disabled}
                value={answer.values?.[i] || ''}
                onChange={(e) => updateValue(i, e.target.value)}
              >
                <option value="">Выбери свой вариант</option>
                {slot.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {answer.values?.[i] && (
              <>
                <WorkbookText text={answer.values[i]} />
                <WorkbookAudio text={answer.values[i]} slow={slow} />
              </>
            )}
          </div>
        ))}
        <p>
          Здесь возможны разные ответы. Заполни все части, затем проверь и послушай свой вариант.
        </p>
        {answer.values?.length === task.slots!.length && (
          <WorkbookAudio text={answer.values} label="Весь текст по предложениям" slow={slow} />
        )}
      </div>
    );
  if (task.mode === 'wordsearch')
    return (
      <div className="wb-wordsearch">
        <div className="wb-grid-scroll">
          <div
            role="grid"
            aria-label="Буквенная сетка"
            className={'wb-letter-grid' + (zoom ? ' large' : '')}
            style={{ gridTemplateColumns: `repeat(${task.grid![0].length},1fr)` }}
          >
            {task.grid!.flatMap((row, r) =>
              row.split('').map((letter, c) => {
                const found = task.placements!.some(
                  (p) =>
                    answer.found?.includes(p.word) &&
                    ((p.start[0] === p.end[0] &&
                      r === p.start[0] &&
                      c >= p.start[1] &&
                      c <= p.end[1]) ||
                      (p.start[1] === p.end[1] &&
                        c === p.start[1] &&
                        r >= p.start[0] &&
                        r <= p.end[0])),
                );
                return (
                  <button
                    role="gridcell"
                    key={r + '-' + c}
                    disabled={disabled}
                    className={
                      found ? 'found' : start?.[0] === r && start[1] === c ? 'selected' : ''
                    }
                    aria-label={`Строка ${r + 1}, столбец ${c + 1}: ${letter}`}
                    onClick={() => (start ? search(start, [r, c]) : setStart([r, c]))}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>
        </div>
        <button className="button" onClick={() => setZoom(!zoom)} aria-pressed={zoom}>
          {zoom ? 'Обычная сетка' : 'Крупная сетка'}
        </button>
        <fieldset className="wb-coordinates">
          <legend>Или выбери координаты начала и конца</legend>
          {['Начало: строка', 'Начало: столбец', 'Конец: строка', 'Конец: столбец'].map(
            (label, i) => (
              <label key={label}>
                {label}
                <select
                  aria-label={label}
                  disabled={disabled}
                  value={coords[i]}
                  onChange={(e) =>
                    setCoords((old) => old.map((v, n) => (n === i ? e.target.value : v)))
                  }
                >
                  {task.grid!.map((_, n) => (
                    <option key={n}>{n + 1}</option>
                  ))}
                </select>
              </label>
            ),
          )}
          <button
            className="button"
            disabled={disabled}
            onClick={() =>
              search(
                coords
                  .slice(0, 2)
                  .map(Number)
                  .map((n) => n - 1),
                coords
                  .slice(2)
                  .map(Number)
                  .map((n) => n - 1),
              )
            }
          >
            Найти слово по координатам
          </button>
        </fieldset>
        <p role="status">{gridMessage}</p>
        <div className="wb-search-targets">
          {task.placements!.map((p) => (
            <div key={p.word}>
              <span>
                {answer.found?.includes(p.word) ? '✓ ' : ''}
                <WorkbookText text={p.word} />
              </span>
              <WorkbookAudio text={p.word} label={p.word} slow={slow} />
            </div>
          ))}
        </div>
      </div>
    );
  const words = task.words!,
    height = Math.max(...words.map((w) => w.row + (w.direction === 'down' ? w.answer.length : 1))),
    width = Math.max(...words.map((w) => w.col + (w.direction === 'across' ? w.answer.length : 1)));
  const cells = new Map<string, { letter: string; number?: number; conflict: boolean }>();
  words.forEach((w, i) =>
    w.answer.split('').forEach((_, j) => {
      const key =
          w.row +
          (w.direction === 'down' ? j : 0) +
          ',' +
          (w.col + (w.direction === 'across' ? j : 0)),
        letter = answer.values?.[i]?.[j]?.toUpperCase() || '',
        old = cells.get(key);
      cells.set(key, {
        letter: old?.letter || letter,
        number: j === 0 ? i + 1 : old?.number,
        conflict: !!old?.letter && !!letter && old.letter !== letter,
      });
    }),
  );
  return (
    <div className="wb-crossword">
      <div className="wb-grid-scroll">
        <div
          className="wb-crossword-grid"
          style={{ gridTemplateColumns: `repeat(${width},28px)` }}
          aria-label="Кроссворд, буквы из твоих ответов"
        >
          {Array.from({ length: height * width }, (_, i) => {
            const cell = cells.get(Math.floor(i / width) + ',' + (i % width));
            return (
              <span
                key={i}
                className={cell ? 'cell' + (cell.conflict ? ' conflict' : '') : 'blank'}
              >
                {cell?.number && <small>{cell.number}</small>}
                {cell?.letter}
              </span>
            );
          })}
        </div>
      </div>
      {words.map((word, i) => (
        <label className="wb-input" key={i}>
          {i + 1}. {word.clue} · {word.direction === 'across' ? 'по горизонтали' : 'по вертикали'} ·{' '}
          {word.answer.length} букв
          <input
            disabled={disabled}
            aria-label={'Кроссворд ' + (i + 1)}
            lang="en-GB"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={answer.values?.[i] || ''}
            onChange={(e) => updateValue(i, e.target.value.replace(/[^a-zA-Z]/g, ''))}
          />
        </label>
      ))}
      <p>
        Вводи слово рядом с примером — буквы появятся в клетках. Красная клетка означает, что две
        буквы в пересечении различаются.
      </p>
    </div>
  );
}
