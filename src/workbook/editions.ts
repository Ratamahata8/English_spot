import navigation from './data/edition-2026-navigation.json';
export const EDITION_2017 = 'spotlight_workbook_2017_6';
export const EDITION_2026 = 'spotlight_workbook_2026_17';
export const LEGACY_SOURCE_ID = 'bykova-pospelova-2017-workbook-3';
export type EditionId = typeof EDITION_2017 | typeof EDITION_2026;
export function canonicalEdition(id: string): EditionId {
  if (id === LEGACY_SOURCE_ID || id === EDITION_2017) return EDITION_2017;
  if (id === EDITION_2026) return EDITION_2026;
  throw Error('Неизвестное издание');
}
export const editionLabel = (id: string) =>
  canonicalEdition(id) === EDITION_2026 ? '17-е изд., 2026' : '6-е изд., 2017';
export const editionFromQuery = (id: string | null): EditionId =>
  id === EDITION_2017 ? EDITION_2017 : EDITION_2026;
export const exerciseEdition = (id: string): EditionId =>
  id.startsWith('wb26-') ? EDITION_2026 : EDITION_2017;
export const edition2026Sections = Object.entries(navigation.printedPageStarts).map(
  ([id, start], index, entries) => ({
    id,
    module: id === 'intro' ? 'intro' : id.replace('module_', ''),
    title: id === 'intro' ? 'Вводный модуль' : 'Модуль ' + id.replace('module_', ''),
    start,
    end: entries[index + 1]?.[1] ?? null,
  }),
);
export const sectionForPage2026 = (page: number) =>
  edition2026Sections.find((s) => page >= s.start && (s.end === null || page < s.end));
