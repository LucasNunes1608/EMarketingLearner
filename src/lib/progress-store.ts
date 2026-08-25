import { emptyProgress, parseProgress, type ProgressState, serializeProgress } from './progress';

/**
 * localStorage plumbing, isolated behind a tiny interface so the failure paths
 * can be tested with fakes.
 *
 * Every access is wrapped: reading `globalThis.localStorage` itself throws in
 * some contexts (storage blocked by browser settings, sandboxed iframes, strict
 * privacy modes), so it is not enough to guard only get/set calls. Progress is a
 * convenience, never a requirement — if storage is unavailable the site must
 * still work, just without remembering anything.
 */

export const STORAGE_KEY = 'negocio-digital:progress:v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Returns usable storage, or null when unavailable.
 *
 * Probes with a real write because some browsers expose `localStorage` but throw
 * on `setItem` (Safari private browsing historically, and any profile at quota).
 */
export function getBrowserStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    const probe = '__nd_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function loadProgress(storage: StorageLike | null): ProgressState {
  if (!storage) return emptyProgress();
  try {
    return parseProgress(storage.getItem(STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

/** Persists state. Returns false when storage rejected the write (e.g. quota). */
export function saveProgress(storage: StorageLike | null, state: ProgressState): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, serializeProgress(state));
    return true;
  } catch {
    return false;
  }
}

/** Clears stored progress. Returns false when storage is unavailable. */
export function clearProgress(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
