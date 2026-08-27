import { writeFile } from 'node:fs/promises';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import type { AstroIntegration } from 'astro';
import { defineConfig } from 'astro/config';

import { SITE } from './src/config/site';
import { getBuildVersion } from './src/lib/build-version';
import { rehypeWorksheetCheckboxes } from './src/lib/rehype-worksheet-checkboxes';

/**
 * Write the build version into the output as a file of its own.
 *
 * `src/lib/build-version.ts` explains what the version is and why. `dist/version.json`
 * exists so that what is live can be read with one request instead of by scraping a
 * page — `curl <site>/version.json` after a deploy answers "has it propagated yet?".
 *
 * The other consumer, `<meta name="build-version">`, needs none of this: BaseLayout's
 * frontmatter runs in Node at build time and simply imports the value.
 *
 * It runs as an integration rather than a step in the `build` npm script so that a bare
 * `astro build` produces it too.
 */
function buildVersion(): AstroIntegration {
  return {
    name: 'build-version',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const version = getBuildVersion();

        await writeFile(new URL('version.json', dir), `${JSON.stringify({ version })}\n`, 'utf8');

        logger.info(`wrote version.json for build ${version}`);
      },
    },
  };
}

// Fully static output: every route is pre-rendered to HTML at build time so the
// site can be served from a CDN with zero compute cost. This is the core of the
// project's cost model — see plans/v1-negocio-digital-platform.md.
export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap(), buildVersion()],
  markdown: {
    // Turns `- [ ]` checkboxes into decorative, printable boxes. See the plugin
    // for why the default <input> rendering is wrong here.
    rehypePlugins: [rehypeWorksheetCheckboxes],
  },
  vite: {
    plugins: [tailwindcss()],
    // Never inline assets into the HTML. Astro would otherwise inline small
    // <script> blocks, and an inline script cannot be allowed by a static
    // Content-Security-Policy without `unsafe-inline` — which would defeat the
    // point of the CSP in public/_headers. Keeping every script external lets us
    // ship `script-src 'self'`.
    build: { assetsInlineLimit: 0 },
  },
  build: {
    // Emit `/curso/slug/index.html` so the CDN can serve clean URLs without redirects.
    format: 'directory',
  },
});
