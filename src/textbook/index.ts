import data from './scenes.json';
export interface TextbookLine {
  id: string;
  en: string;
  ru: string;
  why: string;
  box: number[];
  chunks: { en: string; ru: string }[];
}
export interface TextbookScene {
  id: string;
  title: string;
  page: number;
  module: number;
  lessonIds: string[];
  kind: string;
  image: string;
  lines: TextbookLine[];
}
export const scenes: TextbookScene[] = data;
export function findScene(id: string) {
  return scenes.find((s) => s.id === id);
}
export interface ReaderProgress {
  sceneId: string;
  lastLineId: string;
  heard: string[];
  understood: string[];
  bookmarks: string[];
  updatedAt: number;
}
export function emptyReader(scene: TextbookScene): ReaderProgress {
  return {
    sceneId: scene.id,
    lastLineId: scene.lines[0].id,
    heard: [],
    understood: [],
    bookmarks: [],
    updatedAt: 0,
  };
}
export function validateReader(value: unknown): ReaderProgress[] {
  if (!Array.isArray(value) || value.length > scenes.length)
    throw Error('Некорректное сохранение учебника.');
  const ids = new Set<string>();
  return value.map((raw) => {
    const p = raw as ReaderProgress;
    const scene = p && findScene(p.sceneId);
    if (!scene || ids.has(p.sceneId)) throw Error('Неизвестная или повторная страница.');
    ids.add(p.sceneId);
    const known = new Set(scene.lines.map((l) => l.id));
    if (
      !known.has(p.lastLineId) ||
      !Number.isFinite(p.updatedAt) ||
      p.updatedAt < 0 ||
      [p.heard, p.understood, p.bookmarks].some(
        (a) => !Array.isArray(a) || a.some((id) => !known.has(id)) || new Set(a).size !== a.length,
      )
    )
      throw Error('Повреждены отметки реплик.');
    return structuredClone(p);
  });
}
