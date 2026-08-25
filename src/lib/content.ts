import type { CourseData, LessonData, WorksheetData } from './schemas';

/**
 * Pure content helpers.
 *
 * Every function here takes plain arrays and returns plain data — no
 * `astro:content` import, no I/O. That keeps the ordering, navigation and
 * integrity rules unit-testable without a build, and it means Astro pages only
 * have to do `getCollection()` and hand the result over.
 */

/** Structural shape of a collection entry, matching what getCollection() returns. */
export interface Entry<T> {
  /** Glob loader id. For lessons this is "<course-slug>/<nn>-<lesson-slug>". */
  id: string;
  data: T;
}

export type CourseEntry = Entry<CourseData>;
export type LessonEntry = Entry<LessonData>;
export type WorksheetEntry = Entry<WorksheetData>;

/** The URL segment for a course, e.g. "colocando-seu-negocio-no-digital". */
export function courseSlug(course: CourseEntry): string {
  return course.id;
}

/**
 * The URL segment for a lesson: the final path segment of its id, with any
 * numeric ordering prefix left intact so file order and URL stay legible.
 */
export function lessonSlug(lesson: LessonEntry): string {
  const segments = lesson.id.split('/');
  return segments[segments.length - 1] ?? lesson.id;
}

export function coursePath(slug: string): string {
  return `/curso/${slug}`;
}

export function lessonPath(course: string, lesson: string): string {
  return `/curso/${course}/${lesson}`;
}

export function certificatePath(course: string): string {
  return `/certificado/${course}`;
}

/** Published courses, ordered for the catalog. */
export function getPublishedCourses(courses: readonly CourseEntry[]): CourseEntry[] {
  return courses.filter((c) => c.data.published).sort((a, b) => a.data.order - b.data.order);
}

/** Published lessons belonging to one course, in teaching order. */
export function getLessonsForCourse(
  lessons: readonly LessonEntry[],
  course: string
): LessonEntry[] {
  return lessons
    .filter((l) => l.data.published && l.data.course === course)
    .sort((a, b) => a.data.order - b.data.order);
}

/**
 * Previous/next lesson within a course, for the lesson footer navigation.
 * `lessons` must already be filtered to one course and sorted.
 */
export function getAdjacentLessons(
  lessons: readonly LessonEntry[],
  currentSlug: string
): { previous: LessonEntry | null; next: LessonEntry | null } {
  const index = lessons.findIndex((l) => lessonSlug(l) === currentSlug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: lessons[index - 1] ?? null,
    next: lessons[index + 1] ?? null,
  };
}

export function getCourseDurationSeconds(lessons: readonly LessonEntry[]): number {
  return lessons.reduce((total, lesson) => total + lesson.data.durationSeconds, 0);
}

/**
 * Human duration in pt-BR. Rounds up to the next minute so a 7m10s lesson reads
 * as "8 min" rather than promising less time than it takes.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const totalMinutes = Math.ceil(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${totalMinutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

/** Whole-percent completion, clamped to 0-100. Returns 0 for an empty course. */
export function completionPercent(completedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const raw = (completedCount / totalCount) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Fail the build on broken content rather than shipping a dead link.
 *
 * Astro's `reference()` would cover the course link, but keeping `course` a plain
 * string lets these schemas stay testable — so the relational checks live here and
 * are called once from the content loader.
 *
 * @throws Error listing every problem found, so one build surfaces all of them.
 */
export function assertContentIntegrity(
  courses: readonly CourseEntry[],
  lessons: readonly LessonEntry[],
  worksheets: readonly WorksheetEntry[]
): void {
  const problems: string[] = [];
  const courseIds = new Set(courses.map((c) => c.id));
  const worksheetIds = new Set(worksheets.map((w) => w.id));
  const lessonSlugs = new Set(lessons.map((l) => lessonSlug(l)));

  for (const lesson of lessons) {
    if (!courseIds.has(lesson.data.course)) {
      problems.push(
        `Lesson "${lesson.id}" references course "${lesson.data.course}", which does not exist.`
      );
    }

    // A lesson nested under a directory must belong to the course that names it.
    const [directory] = lesson.id.split('/');
    if (directory !== undefined && lesson.id.includes('/') && directory !== lesson.data.course) {
      problems.push(
        `Lesson "${lesson.id}" sits in directory "${directory}" but declares course "${lesson.data.course}".`
      );
    }

    if (lesson.data.worksheet !== undefined && !worksheetIds.has(lesson.data.worksheet)) {
      problems.push(
        `Lesson "${lesson.id}" references worksheet "${lesson.data.worksheet}", which does not exist.`
      );
    }
  }

  for (const worksheet of worksheets) {
    if (!lessonSlugs.has(worksheet.data.lesson)) {
      problems.push(
        `Worksheet "${worksheet.id}" references lesson "${worksheet.data.lesson}", which does not exist.`
      );
    }
  }

  // Duplicate ordering makes lesson sequence non-deterministic between builds.
  for (const course of courses) {
    const seen = new Map<number, string>();
    for (const lesson of lessons.filter((l) => l.data.course === course.id)) {
      const clash = seen.get(lesson.data.order);
      if (clash !== undefined) {
        problems.push(
          `Course "${course.id}" has two lessons with order ${lesson.data.order}: "${clash}" and "${lesson.id}".`
        );
      }
      seen.set(lesson.data.order, lesson.id);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Content integrity check failed:\n  - ${problems.join('\n  - ')}`);
  }
}
