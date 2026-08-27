import { describe, expect, it } from 'vitest';

import {
  assertContentIntegrity,
  certificatePath,
  completionPercent,
  type CourseEntry,
  coursePath,
  formatDuration,
  getAdjacentLessons,
  getCourseDurationSeconds,
  getLessonsForCourse,
  getPublishedCourses,
  type LessonEntry,
  lessonPath,
  lessonSlug,
  type WorksheetEntry,
  worksheetPath,
} from '@/lib/content';

const COURSE = 'colocando-seu-negocio-no-digital';

function course(id: string, order: number, published = true): CourseEntry {
  return {
    id,
    data: {
      title: id,
      description: 'descrição',
      level: 'iniciante',
      order,
      published,
    },
  };
}

function lesson(
  slug: string,
  order: number,
  {
    courseId = COURSE,
    published = true,
    durationSeconds = 600,
    worksheet = undefined as string | undefined,
  } = {}
): LessonEntry {
  return {
    id: `${courseId}/${slug}`,
    data: {
      title: slug,
      course: courseId,
      order,
      video: { provider: 'youtube', id: 'AULA0000001' },
      durationSeconds,
      summary: 'resumo',
      worksheet,
      published,
    },
  };
}

describe('getPublishedCourses', () => {
  it('sorts by order and drops unpublished drafts', () => {
    const result = getPublishedCourses([
      course('c-segundo', 2),
      course('c-rascunho', 1, false),
      course('c-primeiro', 0),
    ]);
    expect(result.map((c) => c.id)).toEqual(['c-primeiro', 'c-segundo']);
  });

  it('returns an empty array when nothing is published', () => {
    expect(getPublishedCourses([course('c', 1, false)])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [course('b', 2), course('a', 1)];
    const snapshot = input.map((c) => c.id);
    getPublishedCourses(input);
    expect(input.map((c) => c.id)).toEqual(snapshot);
  });
});

describe('getLessonsForCourse', () => {
  const lessons = [
    lesson('03-terceira', 3),
    lesson('01-primeira', 1),
    lesson('02-segunda', 2),
    lesson('04-rascunho', 4, { published: false }),
    lesson('01-de-outro-curso', 1, { courseId: 'outro-curso' }),
  ];

  it('returns only published lessons of the requested course, in order', () => {
    const result = getLessonsForCourse(lessons, COURSE);
    expect(result.map(lessonSlug)).toEqual(['01-primeira', '02-segunda', '03-terceira']);
  });

  it('returns an empty array for an unknown course', () => {
    expect(getLessonsForCourse(lessons, 'nao-existe')).toEqual([]);
  });
});

describe('getAdjacentLessons', () => {
  const lessons = [lesson('01-a', 1), lesson('02-b', 2), lesson('03-c', 3)];

  it('finds both neighbours in the middle of a course', () => {
    const { previous, next } = getAdjacentLessons(lessons, '02-b');
    expect(previous && lessonSlug(previous)).toBe('01-a');
    expect(next && lessonSlug(next)).toBe('03-c');
  });

  it('has no previous on the first lesson', () => {
    const { previous, next } = getAdjacentLessons(lessons, '01-a');
    expect(previous).toBeNull();
    expect(next && lessonSlug(next)).toBe('02-b');
  });

  it('has no next on the last lesson', () => {
    const { previous, next } = getAdjacentLessons(lessons, '03-c');
    expect(previous && lessonSlug(previous)).toBe('02-b');
    expect(next).toBeNull();
  });

  it('returns nulls for a slug that is not in the list', () => {
    expect(getAdjacentLessons(lessons, 'inexistente')).toEqual({ previous: null, next: null });
  });

  it('handles a single-lesson course', () => {
    expect(getAdjacentLessons([lesson('01-a', 1)], '01-a')).toEqual({
      previous: null,
      next: null,
    });
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [-10, '0 min'],
    [59, '1 min'],
    [60, '1 min'],
    [430, '8 min'],
    [480, '8 min'],
    [3600, '1 h'],
    [3900, '1 h 05 min'],
    [7260, '2 h 01 min'],
  ])('formats %i seconds as "%s"', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it('rounds up so a lesson never promises less time than it takes', () => {
    expect(formatDuration(421)).toBe('8 min');
  });

  it('survives NaN without throwing', () => {
    expect(formatDuration(Number.NaN)).toBe('0 min');
  });
});

describe('getCourseDurationSeconds', () => {
  it('sums lesson durations', () => {
    expect(
      getCourseDurationSeconds([
        lesson('01-a', 1, { durationSeconds: 480 }),
        lesson('02-b', 2, { durationSeconds: 600 }),
      ])
    ).toBe(1080);
  });

  it('is zero for an empty course', () => {
    expect(getCourseDurationSeconds([])).toBe(0);
  });
});

describe('completionPercent', () => {
  it.each([
    [0, 6, 0],
    [3, 6, 50],
    [6, 6, 100],
    [1, 3, 33],
    [2, 3, 67],
  ])('reports %i of %i as %i%%', (done, total, expected) => {
    expect(completionPercent(done, total)).toBe(expected);
  });

  it('returns 0 rather than NaN for an empty course', () => {
    expect(completionPercent(0, 0)).toBe(0);
  });

  it('clamps impossible values instead of exceeding 100', () => {
    expect(completionPercent(9, 6)).toBe(100);
    expect(completionPercent(-1, 6)).toBe(0);
  });
});

describe('path helpers', () => {
  // Trailing slashes are load-bearing: build.format is 'directory', so the
  // slash-less form is a 308 redirect on Cloudflare and costs an extra round
  // trip on every internal navigation.
  it('builds a lesson URL matching the routing structure', () => {
    expect(lessonPath(COURSE, '01-google-meu-negocio')).toBe(
      '/curso/colocando-seu-negocio-no-digital/01-google-meu-negocio/'
    );
  });

  it('builds a course URL', () => {
    expect(coursePath(COURSE)).toBe('/curso/colocando-seu-negocio-no-digital/');
  });

  it('builds a certificate URL', () => {
    expect(certificatePath(COURSE)).toBe('/certificado/colocando-seu-negocio-no-digital/');
  });

  it('builds a worksheet URL', () => {
    expect(worksheetPath('01-google-meu-negocio')).toBe('/ficha/01-google-meu-negocio/');
  });

  it('ends every generated path with a slash, so none of them redirect', () => {
    const paths = [
      coursePath(COURSE),
      lessonPath(COURSE, '01-google-meu-negocio'),
      certificatePath(COURSE),
      worksheetPath('01-google-meu-negocio'),
    ];
    for (const path of paths) expect(path.endsWith('/')).toBe(true);
  });
});

describe('assertContentIntegrity', () => {
  const courses = [course(COURSE, 1)];
  const worksheets: WorksheetEntry[] = [
    { id: '01-ficha', data: { title: 'Ficha', lesson: '01-a' } },
  ];

  it('passes for consistent content', () => {
    expect(() =>
      assertContentIntegrity(courses, [lesson('01-a', 1, { worksheet: '01-ficha' })], worksheets)
    ).not.toThrow();
  });

  it('rejects a lesson pointing at a course that does not exist', () => {
    expect(() =>
      assertContentIntegrity(courses, [lesson('01-a', 1, { courseId: 'curso-fantasma' })], [])
    ).toThrow(/references course "curso-fantasma"/);
  });

  it('rejects a lesson whose directory disagrees with its course field', () => {
    const misfiled: LessonEntry = {
      ...lesson('01-a', 1),
      id: `outro-curso/01-a`,
    };
    expect(() => assertContentIntegrity(courses, [misfiled], [])).toThrow(/sits in directory/);
  });

  it('rejects a lesson pointing at a worksheet that does not exist', () => {
    expect(() =>
      assertContentIntegrity(courses, [lesson('01-a', 1, { worksheet: 'nao-existe' })], [])
    ).toThrow(/references worksheet "nao-existe"/);
  });

  it('rejects a worksheet pointing at a lesson that does not exist', () => {
    expect(() =>
      assertContentIntegrity(
        courses,
        [lesson('01-a', 1)],
        [{ id: 'orfa', data: { title: 'Órfã', lesson: '99-nao-existe' } }]
      )
    ).toThrow(/references lesson "99-nao-existe"/);
  });

  it('rejects duplicate lesson ordering, which makes sequence non-deterministic', () => {
    expect(() =>
      assertContentIntegrity(courses, [lesson('01-a', 1), lesson('02-b', 1)], [])
    ).toThrow(/two lessons with order 1/);
  });

  it('reports every problem at once so one build surfaces them all', () => {
    let message = '';
    try {
      assertContentIntegrity(
        courses,
        [lesson('01-a', 1, { courseId: 'fantasma' }), lesson('02-b', 2, { worksheet: 'sumiu' })],
        []
      );
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/fantasma/);
    expect(message).toMatch(/sumiu/);
  });
});
