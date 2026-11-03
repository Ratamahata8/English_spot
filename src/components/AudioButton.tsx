import { useState } from 'react';
import { playAudio } from '../services/audio';
import { useProgress } from '../stores/progress';
export function AudioButton({
  text,
  label = 'Послушать',
  large = false,
}: {
  text: string;
  label?: string;
  large?: boolean;
}) {
  const slow = useProgress((s) => s.progress.settings.slow);
  const [error, setError] = useState('');
  return (
    <span className="audio-wrap">
      <button
        className={large ? 'button primary audio-large' : 'button audio'}
        onClick={() => {
          setError('');
          void playAudio(text, slow).catch((e) => setError(e.message));
        }}
        aria-label={`${label}: ${text}`}
      >
        <span aria-hidden="true">♫</span> {label}
      </button>
      {error && (
        <span className="audio-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
