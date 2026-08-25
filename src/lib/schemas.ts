import { z } from 'astro/zod';

/**
 * Content schemas.
 *
 * These are deliberately kept free of any `astro:content` import so they can be
 * unit-tested directly, without a build step. `src/content.config.ts` wires them
 * into Astro's glob loaders; nothing else should redefine them.
 *
 * Validation here runs at BUILD time, which is the whole point: a malformed
 * YouTube ID or a lesson pointing at a course that does not exist breaks CI
 * rather than shipping a blank video player to a learner on mobile data.
 */

/** YouTube video IDs are exactly 11 URL-safe base64 characters. */
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** Slugs used in file names and URLs: lowercase, digits, hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Where a lesson's video comes from.
 *
 * `youtube` is the only provider implemented in V1 (zero hosting cost). The
 * `hls` arm exists so migrating to self-hosted video on Cloudflare R2 is an
 * additive change — add the player branch, change the frontmatter, done. See
 * the migration notes in README.md.
 */
export const videoSourceSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('youtube'),
    id: z
      .string()
      .regex(
        YOUTUBE_ID_PATTERN,
        'YouTube IDs must be exactly 11 characters of A-Z, a-z, 0-9, _ or -'
      ),
  }),
  z.object({
    provider: z.literal('hls'),
    /** Absolute URL to an .m3u8 playlist. */
    src: z.string().url(),
    poster: z.string().url().optional(),
  }),
]);

export const courseSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  level: z.enum(['iniciante', 'intermediario', 'avancado']),
  /** Display order in the catalog. Lower comes first. */
  order: z.number().int().nonnegative(),
  /** Set false to keep a draft in the repo without publishing it. */
  published: z.boolean().default(true),
});

export const lessonSchema = z.object({
  title: z.string().min(1).max(120),
  /** Slug of the owning course. Integrity is enforced by assertContentIntegrity. */
  course: z.string().regex(SLUG_PATTERN),
  order: z.number().int().positive(),
  video: videoSourceSchema,
  /** Runtime in seconds; drives the "8 min" labels and total course duration. */
  durationSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 4),
  summary: z.string().min(1).max(200),
  /** Slug of an optional printable worksheet. */
  worksheet: z.string().regex(SLUG_PATTERN).optional(),
  published: z.boolean().default(true),
});

export const worksheetSchema = z.object({
  title: z.string().min(1).max(120),
  lesson: z.string().regex(SLUG_PATTERN),
});

export type VideoSource = z.infer<typeof videoSourceSchema>;
export type CourseData = z.infer<typeof courseSchema>;
export type LessonData = z.infer<typeof lessonSchema>;
export type WorksheetData = z.infer<typeof worksheetSchema>;
