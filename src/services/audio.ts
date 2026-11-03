import manifest from '../../public/audio/en-GB/manifest.json';
import type { AudioAsset } from '../types';
const assets = manifest as Record<string, AudioAsset>;
let active: HTMLAudioElement | null = null;
export async function playAudio(text: string, slow = false): Promise<void> {
  const asset = assets[text];
  if (!asset) throw Error('Озвучка ещё не подготовлена. Нужен настоящий MP3 для этой фразы.');
  if (active) {
    active.pause();
    active.currentTime = 0;
  }
  const audio = new Audio(`${import.meta.env.BASE_URL}audio/en-GB/${asset.path}`);
  audio.playbackRate = slow ? 0.75 : 1;
  audio.preservesPitch = true;
  active = audio;
  await audio.play();
}
export const stopAudio = () => {
  active?.pause();
  active = null;
};
export const audioAvailable = Object.keys(assets).length > 0;
