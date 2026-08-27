import { expect, type Page, test } from '@playwright/test';

/**
 * Build identity and cache invalidation.
 *
 * Two questions this suite answers, both of which used to have no answer at all:
 *
 *   1. "Which build am I looking at?" — every page states its build version, and so
 *      do the service worker and /version.json, so a bug report can name a deploy.
 *   2. "Can a stale cache still be serving?" — the worker's cache is named after the
 *      build, so a new deploy cannot reuse the previous deploy's entries.
 *
 * Before this existed the worker's cache was called `negocio-digital-v1` in every
 * deploy forever. Because `public/sw.js` is copied to `dist/` verbatim, the file was
 * byte-identical between deploys too, so the browser's update check never found a new
 * worker: `install` never re-ran, and the precached `/` and `/offline/` stayed frozen
 * at whatever the learner's first visit fetched.
 *
 * These run against the real static build served through `wrangler pages dev`
 * (see playwright.config.ts), so what is asserted is what Cloudflare will serve.
 */

/** Independent of the implementation on purpose: this is the contract, restated. */
const VERSION_SHAPE = /^[a-z0-9-]+$/;

/** The name the cache had when it never changed. Nothing served may still say this. */
const FROZEN_CACHE_NAME = 'negocio-digital-v1';

const CACHE_PREFIX = 'negocio-digital-';

const COURSE = '/curso/colocando-seu-negocio-no-digital';

async function versionFromHtml(page: Page, path: string): Promise<string> {
  const response = await page.request.get(path);
  expect(response.status(), `${path} should be served`).toBe(200);

  const match = /<meta name="build-version" content="([^"]*)"/.exec(await response.text());
  expect(match, `${path} carries no <meta name="build-version">`).not.toBeNull();

  return match?.[1] ?? '';
}

/** Every `negocio-digital-*` cache currently in this origin's Cache Storage. */
async function ourCacheKeys(page: Page, prefix: string): Promise<string[]> {
  return page.evaluate(
    async (cachePrefix) => (await caches.keys()).filter((key) => key.startsWith(cachePrefix)),
    prefix
  );
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

test.describe('the service worker cache rotates with the build', () => {
  /**
   * The core assertion of this branch. `public/sw.js` ships a placeholder; the build
   * stamps the real version into `dist/sw.js`. If this fails, the deployed worker is
   * the verbatim source and its cache name is frozen.
   */
  test('the served worker is stamped with the build version, not a placeholder', async ({
    page,
  }) => {
    const response = await page.request.get('/sw.js');
    expect(response.status()).toBe(200);

    const source = await response.text();

    // Asserted before anything is read from the HTML, so that a failure here names
    // this bug rather than the missing meta tag.
    expect(
      source,
      'the worker still uses the frozen cache name, so a new deploy reuses the old cache'
    ).not.toContain(FROZEN_CACHE_NAME);
    expect(
      source,
      'the placeholder was never stamped, so the cache name is a constant'
    ).not.toContain('__BUILD_VERSION__');

    expect(source).toContain(await versionFromHtml(page, '/'));
  });

  test('the cache the worker actually opens is named for this build', async ({ page }) => {
    const version = await versionFromHtml(page, '/');

    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

    await expect
      .poll(() => ourCacheKeys(page, CACHE_PREFIX), { timeout: 15_000 })
      .toEqual([`${CACHE_PREFIX}${version}`]);
  });

  /**
   * What a deploy does to the previous deploy's cache.
   *
   * Honest scope note: one Playwright run serves exactly one build, so a real
   * two-deploy rotation cannot be staged here. What is staged instead is each half of
   * it — a cache planted under the name a previous deploy's cache would have, and a
   * genuine fresh install-and-activate cycle.
   *
   * The cycle is provoked by registering the worker under a different script URL,
   * because that is the one thing within a single build that makes the browser install
   * a new worker, and it is precisely what a deploy does: change the worker script.
   * `unregister()` followed by `register()` does not work — per spec, re-registering a
   * registration that is still uninstalling just clears the flag and reuses the same
   * worker, so `activate` never runs again.
   *
   * The purge itself is not the new behaviour; `activate` already deleted cache names
   * other than its own. What was missing is that its own name was a constant, so the
   * previous deploy's cache and the new deploy's cache were the same object and there
   * was nothing to delete. The assertion with teeth is therefore the name left behind.
   */
  test("a previous build's cache does not survive activation", async ({ page }) => {
    const version = await versionFromHtml(page, '/');
    const previousBuild = `${CACHE_PREFIX}0000000a`;

    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

    await page.evaluate(async (name) => {
      const cache = await caches.open(name);
      await cache.put('/stale-marker', new Response('a page from the previous deploy'));
    }, previousBuild);

    expect(await ourCacheKeys(page, CACHE_PREFIX)).toContain(previousBuild);

    // Stands in for the deploy that changes the worker script.
    await page.evaluate(() => navigator.serviceWorker.register('/sw.js?deploy=probe'));

    await expect
      .poll(() => ourCacheKeys(page, CACHE_PREFIX), { timeout: 15_000 })
      .toEqual([`${CACHE_PREFIX}${version}`]);

    expect(
      await page.evaluate(async (name) => (await caches.has(name)) as boolean, previousBuild)
    ).toBe(false);
  });

  /**
   * Regression guard for d875bd8. The offline fallback is precached at install, and a
   * redirecting URL there left `cache.add()` pending forever so the worker never
   * activated. Rotating the cache name means `install` now runs on every deploy rather
   * than once ever, which makes that failure mode considerably more expensive.
   */
  test('the offline page is precached at its redirect-free URL', async ({ page }) => {
    const version = await versionFromHtml(page, '/');

    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));

    await expect
      .poll(
        async () =>
          page.evaluate(async (name) => {
            const cache = await caches.open(name);
            return (await cache.keys()).map((request) => new URL(request.url).pathname).sort();
          }, `${CACHE_PREFIX}${version}`),
        { timeout: 15_000 }
      )
      .toContain('/offline/');
  });
});
