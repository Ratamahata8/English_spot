import type { LearningProgress } from '../types';
export const SETTINGS_KEY = 'english-spot-settings-v1';
// Only UI preferences use this synchronous recovery copy. Exercise results remain in IndexedDB.
export function rememberSettings(p: LearningProgress) {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          schemaVersion: 1,
          lessonId: p.lessonId,
          updatedAt: p.updatedAt,
          settings: p.settings,
        }),
      );
  } catch {
    /* IndexedDB remains the primary save path when localStorage is unavailable. */
  }
}
export function recoverSettings(p: LearningProgress, hasPersistedRecord = true): LearningProgress {
  try {
    if (typeof localStorage === 'undefined') return p;
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return p;
    const saved = JSON.parse(raw);
    if (
      saved.schemaVersion !== 1 ||
      saved.lessonId !== p.lessonId ||
      !Number.isFinite(saved.updatedAt) ||
      // An empty state created on reload has no saved timestamp to outrank this recovery copy.
      (hasPersistedRecord && saved.updatedAt < p.updatedAt) ||
      typeof saved.settings?.slow !== 'boolean' ||
      typeof saved.settings?.reduceMotion !== 'boolean'
    )
      return p;
    if (
      saved.settings.slow === p.settings.slow &&
      saved.settings.reduceMotion === p.settings.reduceMotion
    )
      return p;
    return {
      ...p,
      updatedAt: saved.updatedAt,
      settings: { slow: saved.settings.slow, reduceMotion: saved.settings.reduceMotion },
    };
  } catch {
    return p;
  }
}
export function forgetSettings() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* No persistent copy to remove. */
  }
}
