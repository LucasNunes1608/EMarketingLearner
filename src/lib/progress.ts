/**
 * Learner progress: pure state transitions.
 *
 * Progress never leaves the learner's device. There is no account, no server and
 * no cookie — which is both the cost decision (no database to run) and the
 * privacy decision (nothing to disclose, no LGPD data-subject obligations).
 *
 * Everything here is pure so the parsing, migration and corruption paths are
 * testable without a browser. The localStorage plumbing lives in progress-store.ts.
 */

/** Bump when the persisted shape changes, and add a branch to `migrate`. */
export const PROGRESS_VERSION = 1;

export interface LastWatched {
  course: string;
  lesson: string;
  title: string;
}

export interface ProgressState {
  version: number;
  /** Course id → slugs of completed lessons. */
  completed: Record<string, string[]>;
  /** Where to resume from, for "Continue de onde parou". */
  last: LastWatched | null;
  /** Name printed on the certificate. Entered by the learner, stored locally. */
  name: string | null;
}

export function emptyProgress(): ProgressState {
  return { version: PROGRESS_VERSION, completed: {}, last: null, name: null };
}

function completedFor(state: ProgressState, course: string): string[] {
  return state.completed[course] ?? [];
}

export function isLessonComplete(state: ProgressState, course: string, lesson: string): boolean {
  return completedFor(state, course).includes(lesson);
}

/** Returns a new state with `lesson` marked done or not done. */
export function setLessonComplete(
  state: ProgressState,
  course: string,
  lesson: string,
  done: boolean
): ProgressState {
  const current = completedFor(state, course);
  const already = current.includes(lesson);
  if (done === already) return state;

  const next = done ? [...current, lesson] : current.filter((id) => id !== lesson);

  return { ...state, completed: { ...state.completed, [course]: next } };
}

export function toggleLesson(state: ProgressState, course: string, lesson: string): ProgressState {
  return setLessonComplete(state, course, lesson, !isLessonComplete(state, course, lesson));
}

export function completedCount(state: ProgressState, course: string): number {
  return completedFor(state, course).length;
}

/**
 * A course counts as finished when every lesson currently published is done.
 * `totalLessons` is passed in because progress does not know the catalog — that
 * also means removing a lesson cannot leave someone stuck at 5/6 forever.
 */
export function isCourseComplete(
  state: ProgressState,
  course: string,
  totalLessons: number
): boolean {
  if (totalLessons <= 0) return false;
  return completedCount(state, course) >= totalLessons;
}

export function setLastWatched(state: ProgressState, last: LastWatched): ProgressState {
  return { ...state, last };
}

export function setLearnerName(state: ProgressState, name: string): ProgressState {
  const trimmed = name.trim();
  return { ...state, name: trimmed.length > 0 ? trimmed : null };
}

export function serializeProgress(state: ProgressState): string {
  return JSON.stringify(state);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeCompleted(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};

  const result: Record<string, string[]> = {};
  for (const [course, lessons] of Object.entries(value)) {
    if (!Array.isArray(lessons)) continue;
    // Drop non-strings and duplicates rather than letting them poison counts.
    const clean = [...new Set(lessons.filter((l): l is string => typeof l === 'string'))];
    if (clean.length > 0) result[course] = clean;
  }
  return result;
}

function sanitizeLast(value: unknown): LastWatched | null {
  if (!isRecord(value)) return null;
  const { course, lesson, title } = value;
  if (typeof course !== 'string' || typeof lesson !== 'string') return null;
  return { course, lesson, title: typeof title === 'string' ? title : lesson };
}

/**
 * Migrate a state persisted by an older version of the app.
 *
 * V1 is the first shape, so there is nothing to migrate yet. The seam exists so
 * that a future change has an obvious place to go and cannot silently wipe a
 * learner's progress — which, with no server-side backup, would be unrecoverable.
 */
function migrate(state: ProgressState, fromVersion: number): ProgressState {
  if (fromVersion >= PROGRESS_VERSION) return state;
  return { ...state, version: PROGRESS_VERSION };
}

/**
 * Parse persisted JSON into a valid state, never throwing.
 *
 * Anything unreadable degrades to empty progress. Losing a few checkmarks is a
 * far better failure than a stored blob crashing the lesson page.
 */
export function parseProgress(raw: string | null | undefined): ProgressState {
  if (typeof raw !== 'string' || raw.length === 0) return emptyProgress();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }

  if (!isRecord(parsed)) return emptyProgress();

  const version = typeof parsed.version === 'number' ? parsed.version : 0;

  const state: ProgressState = {
    version: PROGRESS_VERSION,
    completed: sanitizeCompleted(parsed.completed),
    last: sanitizeLast(parsed.last),
    name:
      typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim() : null,
  };

  return migrate(state, version);
}
