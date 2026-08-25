import { describe, expect, it } from 'vitest';

import { emptyProgress, toggleLesson } from '@/lib/progress';
import {
  clearProgress,
  loadProgress,
  saveProgress,
  STORAGE_KEY,
  type StorageLike,
} from '@/lib/progress-store';

const COURSE = 'curso';
const LESSON = 'aula-1';

/** In-memory stand-in for localStorage. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

/** Storage that throws on every operation, like a quota-exceeded or blocked profile. */
function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error('storage blocked');
    },
    setItem: () => {
      throw new Error('quota exceeded');
    },
    removeItem: () => {
      throw new Error('storage blocked');
    },
  };
}

describe('loadProgress', () => {
  it('returns empty progress when storage is unavailable', () => {
    expect(loadProgress(null)).toEqual(emptyProgress());
  });

  it('returns empty progress when nothing has been stored yet', () => {
    expect(loadProgress(fakeStorage())).toEqual(emptyProgress());
  });

  it('reads back what was saved', () => {
    const storage = fakeStorage();
    const state = toggleLesson(emptyProgress(), COURSE, LESSON);
    saveProgress(storage, state);
    expect(loadProgress(storage)).toEqual(state);
  });

  it('degrades to empty progress instead of throwing when storage throws', () => {
    expect(() => loadProgress(throwingStorage())).not.toThrow();
    expect(loadProgress(throwingStorage())).toEqual(emptyProgress());
  });

  it('degrades to empty progress when the stored value is corrupt', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{{{ not json' });
    expect(loadProgress(storage)).toEqual(emptyProgress());
  });
});

describe('saveProgress', () => {
  it('reports success and writes under the versioned key', () => {
    const storage = fakeStorage();
    expect(saveProgress(storage, emptyProgress())).toBe(true);
    expect(storage.data[STORAGE_KEY]).toBeDefined();
  });

  it('reports failure rather than throwing when the write is rejected', () => {
    expect(saveProgress(throwingStorage(), emptyProgress())).toBe(false);
  });

  it('reports failure when storage is unavailable', () => {
    expect(saveProgress(null, emptyProgress())).toBe(false);
  });
});

describe('clearProgress', () => {
  it('removes the stored state', () => {
    const storage = fakeStorage();
    saveProgress(storage, toggleLesson(emptyProgress(), COURSE, LESSON));
    expect(clearProgress(storage)).toBe(true);
    expect(loadProgress(storage)).toEqual(emptyProgress());
  });

  it('reports failure rather than throwing when storage throws', () => {
    expect(clearProgress(throwingStorage())).toBe(false);
  });
});

describe('storage key', () => {
  it('is namespaced and versioned so a future format change cannot collide', () => {
    expect(STORAGE_KEY).toMatch(/^negocio-digital:/);
    expect(STORAGE_KEY).toMatch(/v\d+$/);
  });
});
