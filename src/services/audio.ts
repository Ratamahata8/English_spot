import manifest from '../../public/audio/en-GB/manifest.json';
import textbookEnglish from '../../public/audio/textbook/en-GB/manifest.json';
import textbookRussian from '../../public/audio/textbook/ru-RU/manifest.json';
import type { AudioAsset } from '../types';
const assets = manifest as Record<string, AudioAsset>;
let active: HTMLAudioElement | null = null;
let cancel: (() => void) | null = null;
export const stopAudio = () => {
  active?.pause();
  active = null;
  cancel?.();
  cancel = null;
};
async function play(
  asset: AudioAsset | undefined,
  folder: string,
  slow: boolean,
  untilEnd: boolean,
): Promise<boolean> {
  stopAudio();
  if (!asset) throw Error('Озвучка ещё не подготовлена. Нужен настоящий MP3 для этой фразы.');
  const audio = new Audio(
    `${import.meta.env.BASE_URL}audio/${folder}/${asset.path}?v=${asset.sha256.slice(0, 12)}`,
  );
  audio.playbackRate = slow ? 0.75 : 1;
  audio.preservesPitch = true;
  active = audio;
  const ended = new Promise<boolean>((resolve, reject) => {
    cancel = () => {
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      if (active === audio) {
        active = null;
        cancel = null;
      }
    };
    audio.onended = () => {
      cleanup();
      resolve(true);
    };
    audio.onerror = () => {
      cleanup();
      reject(Error('Не удалось загрузить аудио. Проверь подключение и повтори.'));
    };
  });
  // Always observe the completion promise, including callers that only wait for playback to start.
  void ended.catch(() => {});
  try {
    await audio.play();
  } catch (error) {
    if (active === audio) stopAudio();
    throw error;
  }
  return untilEnd ? ended : true;
}
export async function playAudio(text: string, slow = false): Promise<void> {
  await play(assets[text], 'en-GB', slow, false);
}
export function playTextbook(
  text: string,
  language: 'en-GB' | 'ru-RU' = 'en-GB',
  slow = false,
): Promise<boolean> {
  const corpus = (language === 'en-GB' ? textbookEnglish : textbookRussian) as Record<
    string,
    AudioAsset
  >;
  return play(corpus[text], `textbook/${language}`, slow, true);
}
export const audioAvailable = Object.keys(assets).length > 0;
