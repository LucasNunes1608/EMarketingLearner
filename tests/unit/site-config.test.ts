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

  /**
   * AGPL-3.0 section 13: anyone running a modified version of this site over a
   * network must offer its users the Corresponding Source. The footer renders
   * this value as that offer, so a fork that changes SITE.url must change this
   * too — it has to point at the fork's own repository, not ours.
   */
  it('publishes an absolute https link to the source repository', () => {
    expect(() => new URL(SITE.repository)).not.toThrow();
    expect(SITE.repository.startsWith('https://')).toBe(true);
    expect(SITE.repository.endsWith('/')).toBe(false);
  });
});
