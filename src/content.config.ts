import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';

import { courseSchema, lessonSchema, worksheetSchema } from './lib/schemas';

// Schemas live in src/lib/schemas.ts so they can be unit-tested without astro:content.
// This file only wires them to the filesystem.

const courses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/courses' }),
  schema: courseSchema,
});

const lessons = defineCollection({
  // Lessons are nested one directory per course, so ids look like
  // "colocando-seu-negocio-no-digital/01-google-meu-negocio".
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lessons' }),
  schema: lessonSchema,
});

const worksheets = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/worksheets' }),
  schema: worksheetSchema,
});

export const collections = { courses, lessons, worksheets };
