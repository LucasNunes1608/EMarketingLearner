import { describe, expect, it } from 'vitest';

import { SITE } from '@/config/site';

describe('SITE config', () => {
  it('exposes a non-empty brand name and tagline', () => {
    expect(SITE.name.trim().length).toBeGreaterThan(0);
    expect(SITE.tagline.trim().length).toBeGreaterThan(0);
  });

  it('targets a Brazilian Portuguese audience', () => {
    expect(SITE.lang).toBe('pt-BR');
    expect(SITE.locale).toBe('pt-BR');
  });

  it('declares an absolute https URL for canonical links and the sitemap', () => {
    expect(() => new URL(SITE.url)).not.toThrow();
    expect(SITE.url.startsWith('https://')).toBe(true);
    expect(SITE.url.endsWith('/')).toBe(false);
  });

  it('keeps the meta description within the length search engines display', () => {
    expect(SITE.description.length).toBeLessThanOrEqual(200);
  });
});
