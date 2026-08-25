import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { SITE } from './src/config/site';
import { rehypeWorksheetCheckboxes } from './src/lib/rehype-worksheet-checkboxes';

// Fully static output: every route is pre-rendered to HTML at build time so the
// site can be served from a CDN with zero compute cost. This is the core of the
// project's cost model — see plans/v1-negocio-digital-platform.md.
export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
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
