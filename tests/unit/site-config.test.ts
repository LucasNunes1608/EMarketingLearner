import { describe, expect, it } from 'vitest';

import { SITE } from '@/config/site';

/** Both SITE.url and SITE.repository must be absolute, https, and unslashed. */
function expectAbsoluteHttpsUrl(value: string): void {
  expect(() => new URL(value)).not.toThrow();
  expect(value.startsWith('https://')).toBe(true);
  expect(value.endsWith('/')).toBe(false);
}

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
    expectAbsoluteHttpsUrl(SITE.url);
  });

  it('keeps the meta description within the length search engines display', () => {
    expect(SITE.description.length).toBeLessThanOrEqual(200);
  });

  /** The AGPL-3.0 section 13 offer rendered by the footer. See docs/adr/0010. */
  it('publishes an absolute https link to the source repository', () => {
    expectAbsoluteHttpsUrl(SITE.repository);
  });
});
