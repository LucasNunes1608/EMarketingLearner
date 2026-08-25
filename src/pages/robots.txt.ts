import type { APIRoute } from 'astro';

import { SITE } from '@/config/site';

/**
 * Generated rather than kept in public/ so the sitemap URL always tracks
 * SITE.url — a stale absolute URL here silently breaks search-engine discovery.
 */
export const GET: APIRoute = () => {
  const sitemap = new URL('sitemap-index.xml', SITE.url).href;

  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    // Nothing to index on the certificate page; it is per-learner and gated.
    'Disallow: /certificado/',
    '',
    `Sitemap: ${sitemap}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
