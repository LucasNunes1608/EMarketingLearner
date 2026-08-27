import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Published slugs are permanent identifiers. This file pins them.
 *
 * Learner progress never leaves the device: it lives in localStorage under
 * `negocio-digital:progress:v1`, shaped as
 * `{ completed: { "<course-slug>": ["<lesson-slug>", ...] }, last: { course, lesson } }`.
 * `isLessonComplete` in src/lib/progress.ts is a literal string match against those
 * slugs, so a renamed slug matches nothing at all.
 *
 * That makes renaming a published slug a silent, total and unrecoverable data loss for
 * every learner who had started the thing renamed — there is no account and no server
 * copy to restore from (ADR-0005). Renaming a course directory orphans every lesson in
 * it at once. Nothing else catches this: the build's integrity check only verifies that
 * content agrees with itself, and a wholesale rename is perfectly self-consistent.
 *
 * The assertion semantics are deliberate:
 *   - Renaming or deleting a pinned slug FAILS. That is the entire point of the file.
 *   - Adding a course or a lesson PASSES. New content cannot invalidate progress that
 *     already exists, so publishing must never require editing this file. The check is
 *     therefore a subset — every pinned slug is still present — and never an equality
 *     against the current content.
 *
 * Two scoping choices worth stating:
 *
 * Slugs are read from filenames, not from `published` frontmatter. Unpublishing a course
 * does not erase the strings already sitting in learners' browsers, and re-publishing
 * under the same slug restores their checkmarks; only losing the slug is destructive.
 *
 * Worksheets are not pinned. They are not part of progress state — `completed` and
 * `last` in src/lib/progress.ts hold course and lesson slugs only — so renaming one
 * cannot orphan anything. A worksheet rename that breaks a reference already fails the
 * build loudly in `assertContentIntegrity`, and a stale `/ficha/<slug>/` URL is a
 * recoverable link, not lost learner data.
 *
 * Tests read the content directory with node:fs rather than `astro:content`, which unit
 * tests cannot import without a build (see vitest.config.ts).
 */

const CONTENT_DIR = fileURLToPath(new URL('../../src/content/', import.meta.url));
const COURSES_DIR = path.join(CONTENT_DIR, 'courses');
const LESSONS_DIR = path.join(CONTENT_DIR, 'lessons');

/**
 * Every course and lesson slug that has been published, and is therefore already
 * recorded in some learner's localStorage. Add to this list when content ships; never
 * edit or remove an entry without shipping a progress migration alongside it.
 */
const PINNED_SLUGS: Record<string, readonly string[]> = {
  'colocando-seu-negocio-no-digital': [
    '01-google-meu-negocio',
    '02-whatsapp-business',
    '03-instagram-que-vende',
    '04-pix-e-pagamentos',
    '05-fotos-com-o-celular',
    '06-conteudo-que-atrai-cliente',
  ],
  'vendendo-mais-no-whatsapp': [
    '01-catalogo-que-vende',
    '02-respostas-que-fecham-venda',
    '03-status-e-listas-sem-irritar',
    '04-do-pedido-a-entrega',
  ],
};

/** File names in `dir` with `extension` stripped — i.e. the slugs Astro will emit. */
function slugsIn(dir: string, extension: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => entry.name.slice(0, -extension.length));
}

function courseSlugsOnDisk(): string[] {
  return slugsIn(COURSES_DIR, '.md');
}

/**
 * Lesson slugs for one course. A missing directory returns `[]` rather than throwing,
 * so that renaming a whole course directory still fails with the explanation below
 * instead of an unhelpful ENOENT.
 */
function lessonSlugsOnDisk(course: string): string[] {
  return slugsIn(path.join(LESSONS_DIR, course), '.mdx');
}

/**
 * The failure message is the deliverable here. Whoever trips this test is months away
 * from this conversation, has just innocently renamed a file, and needs to understand
 * what they are about to destroy and what to do instead.
 */
function orphanedSlugMessage(subject: string, location: string, loss: string): string {
  return [
    `${subject} is no longer present in ${location}.`,
    '',
    "Learner progress is keyed on that exact string. It is stored only in the learner's",
    'own browser, under localStorage["negocio-digital:progress:v1"], as',
    '{ "completed": { "<course-slug>": ["<lesson-slug>", ...] } }. There is no account and',
    'no server copy of it (docs/adr/0005-localstorage-progress-no-accounts.md), so nothing',
    'anywhere can restore it.',
    '',
    'So this rename fails silently and irrecoverably: no error, no migration — the old',
    `string simply stops matching, and ${loss}`,
    '',
    'What to do instead:',
    '',
    '  1. Keep the slug. It is a permanent identifier, not a title. The `title` in the',
    '     frontmatter can be reworded as freely as you like, and that is usually what you',
    '     actually wanted to change.',
    '',
    '  2. If the slug genuinely must change, ship a migration with it: bump',
    '     PROGRESS_VERSION and add a branch to `migrate()` in src/lib/progress.ts (called',
    '     from `parseProgress`) that rewrites the old slug to the new one in',
    '     `state.completed` and `state.last`, cover it in tests/unit/progress.test.ts, and',
    '     only then update the pin in this file.',
    '',
    'Background: docs/adr/0011-published-slugs-are-permanent-identifiers.md, and the',
    '"Slugs are permanent" rule in CONTENT.md.',
  ].join('\n');
}

describe('pinned course slugs', () => {
  it.each(Object.keys(PINNED_SLUGS))('still publishes the course "%s"', (course) => {
    expect(
      courseSlugsOnDisk(),
      orphanedSlugMessage(
        `The published course slug "${course}"`,
        'src/content/courses/',
        'every learner who started this course loses their progress for all of it at once.'
      )
    ).toContain(course);
  });
});

describe('pinned lesson slugs', () => {
  const pinnedLessons: [string, string][] = Object.entries(PINNED_SLUGS).flatMap(
    ([course, lessons]) => lessons.map((lesson): [string, string] => [course, lesson])
  );

  it.each(pinnedLessons)('still publishes the lesson "%s/%s"', (course, lesson) => {
    expect(
      lessonSlugsOnDisk(course),
      orphanedSlugMessage(
        `The published lesson slug "${lesson}"`,
        `src/content/lessons/${course}/`,
        'every learner who completed this lesson loses that checkmark for good.'
      )
    ).toContain(lesson);
  });
});
