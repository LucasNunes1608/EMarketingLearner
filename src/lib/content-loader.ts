import { getCollection } from 'astro:content';

import { assertContentIntegrity } from './content';

/**
 * The single place that touches `astro:content`.
 *
 * Pages call this instead of `getCollection()` directly so that every build runs
 * the relational integrity checks exactly once, and so all the pure logic in
 * `content.ts` stays testable without Astro.
 *
 * @throws if any lesson, course or worksheet reference is broken — the build fails
 *   loudly instead of publishing a dead link.
 */
export async function loadContent() {
  const [courses, lessons, worksheets] = await Promise.all([
    getCollection('courses'),
    getCollection('lessons'),
    getCollection('worksheets'),
  ]);

  assertContentIntegrity(courses, lessons, worksheets);

  return { courses, lessons, worksheets };
}
