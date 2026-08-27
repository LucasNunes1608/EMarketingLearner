import { expect, type Page, test } from '@playwright/test';

/**
 * Build identity.
 *
 * The question this answers is "which build am I looking at?", which nothing served
 * could answer before: two deploys were indistinguishable from the outside, so a
 * learner on a cached page and the author reading their report had no shared
 * reference. Every page now states its build, and so does /version.json.
 *
 * These run against the real static build served through `wrangler pages dev`
 * (see playwright.config.ts), so what is asserted is what Cloudflare will serve.
 */

/** Independent of the implementation on purpose: this is the contract, restated. */
const VERSION_SHAPE = /^[a-z0-9-]+$/;

const COURSE = '/curso/colocando-seu-negocio-no-digital';

async function versionFromHtml(page: Page, path: string): Promise<string> {
  const response = await page.request.get(path);
  expect(response.status(), `${path} should be served`).toBe(200);

  const match = /<meta name="build-version" content="([^"]*)"/.exec(await response.text());
  expect(match, `${path} carries no <meta name="build-version">`).not.toBeNull();

  return match?.[1] ?? '';
}

test.describe('the build states its own version', () => {
  test('the home page carries a build version in its head', async ({ page }) => {
    const version = await versionFromHtml(page, '/');

    expect(version).not.toBe('');
    expect(version).toMatch(VERSION_SHAPE);
  });

  /**
   * The tag lives in BaseLayout, which wraps every route, so a learner reporting a
   * problem on any page can be asked which build they are on.
   */
  test('every kind of page carries the same version', async ({ page }) => {
    const home = await versionFromHtml(page, '/');

    for (const path of [
      COURSE,
      `${COURSE}/01-google-meu-negocio`,
      '/ficha/01-google-meu-negocio',
      '/buscar',
      '/certificado/colocando-seu-negocio-no-digital',
      '/offline',
    ]) {
      expect(await versionFromHtml(page, path), `${path} reports a different build`).toBe(home);
    }
  });

  /** The machine-readable surface: `curl <site>/version.json` says what is live. */
  test('/version.json reports the same version as the HTML', async ({ page }) => {
    const response = await page.request.get('/version.json');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ version: await versionFromHtml(page, '/') });
  });
});
