/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Unit tests deliberately avoid importing `astro:content` so they can run without a
// build step. Content logic lives in pure functions (src/lib/*) that receive plain
// objects; Astro pages are the only place that touches getCollection().
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/content/schemas.ts'],
      reporter: ['text', 'html'],
    },
  },
});
