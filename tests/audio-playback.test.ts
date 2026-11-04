import { afterEach, expect, it, vi } from 'vitest';
import { playTextbook, stopAudio } from '../src/services/audio';
import { scenes } from '../src/textbook';
const instances: FakeAudio[] = [];
class FakeAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  playbackRate = 1;
  preservesPitch = true;
  paused = false;
  constructor(public src: string) {
    instances.push(this);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}
afterEach(() => {
  stopAudio();
  vi.unstubAllGlobals();
  instances.length = 0;
});
it('остановка отменяет ожидание завершения, новый язык останавливает старый, скорость сохраняет тон', async () => {
  vi.stubGlobal('Audio', FakeAudio);
  const line = scenes[0].lines[0];
  const first = playTextbook(line.en, 'en-GB', true);
  expect(instances[0].playbackRate).toBe(0.75);
  expect(instances[0].preservesPitch).toBe(true);
  const second = playTextbook(line.ru, 'ru-RU');
  await expect(first).resolves.toBe(false);
  expect(instances[0].paused).toBe(true);
  expect(instances[1].src).toContain('/English_spot/audio/textbook/ru-RU/');
  instances[1].onended?.();
  await expect(second).resolves.toBe(true);
});
it('сетевая ошибка не считается прослушиванием и отклоняет ожидание', async () => {
  vi.stubGlobal('Audio', FakeAudio);
  const promise = playTextbook(scenes[0].lines[0].en);
  const assertion = expect(promise).rejects.toThrow('Не удалось загрузить аудио');
  instances[0].onerror?.();
  await assertion;
});
it('запоздалый отказ старого play не останавливает новую запись', async () => {
  let rejectOld!: (error: Error) => void;
  class DelayedAudio extends FakeAudio {
    play() {
      return instances.length === 1
        ? new Promise<void>((_resolve, reject) => {
            rejectOld = reject;
          })
        : Promise.resolve();
    }
  }
  vi.stubGlobal('Audio', DelayedAudio);
  const line = scenes[0].lines[0];
  const old = playTextbook(line.en);
  const rejected = expect(old).rejects.toThrow('old play failed');
  const fresh = playTextbook(line.ru, 'ru-RU');
  rejectOld(Error('old play failed'));
  await rejected;
  expect(instances[1].paused).toBe(false);
  instances[1].onended?.();
  await expect(fresh).resolves.toBe(true);
});
