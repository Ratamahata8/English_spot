import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
it('reuse checks voice, integrity, containment and intonation without copying files', () => {
  execFileSync(
    'python3',
    ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_audio_reuse.py'],
    { stdio: 'pipe' },
  );
});
