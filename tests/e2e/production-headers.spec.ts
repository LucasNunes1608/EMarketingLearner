import { expect, type Page, test } from '@playwright/test';

/**
 * Production serving behaviour.
 *
 * These tests exist because two bugs reached production that the rest of the
 * suite structurally could not see. The suite used to run against
 * `astro preview`, which serves the built files but ignores `public/_headers`
 * and has no 404 fallback — so the two things Cloudflare Pages does on top of
 * the static output were never exercised:
 *
 *   1. `script-src 'self'` without 'wasm-unsafe-eval' made every search return
 *      nothing, because Pagefind's index is a WebAssembly module.
 *   2. A missing URL answered HTTP 200 with the home page, because no
 *      `dist/404.html` existed and Cloudflare falls back to `index.html`.
 *
 * playwright.config.ts now serves `dist` through `wrangler pages dev`, so
 * `_headers` and the 404 fallback are applied by Cloudflare's own code. Do not
 * move this suite back onto a plain static server: a hand-rolled `_headers`
 * parser would only ever confirm our own reading of the spec, which is exactly
 * the mistake that shipped bug 1.
 */

/** Header names are case-insensitive; Wrangler and Cloudflare both lower-case them. */
async function headersFor(page: Page, path: string): Promise<Record<string, string>> {
  const response = await page.request.get(path);
  expect(response.status(), `${path} should be served`).toBe(200);
  return response.headers();
}

test.describe('security headers from public/_headers', () => {
  test('an HTML response carries every security header', async ({ page }) => {
    const headers = await headersFor(page, '/');

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('geolocation=()');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  test("the CSP allows WebAssembly, or Pagefind's search index cannot run", async ({ page }) => {
    const csp = (await headersFor(page, '/'))['content-security-policy'] ?? '';

    expect(csp, 'no Content-Security-Policy header was served').not.toBe('');

    const scriptSrc = csp
      .split(';')
      .map((directive) => directive.trim())
      .find((directive) => directive.startsWith('script-src'));

    expect(scriptSrc, 'the CSP has no script-src directive').toBeTruthy();
    // Bug 1: without this, browsers refuse to compile Pagefind's WASM module.
    expect(scriptSrc).toContain("'wasm-unsafe-eval'");

    // 'wasm-unsafe-eval' permits WASM compilation only. These would hand script
    // injection back the ground the CSP is there to take away.
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  test('the CSP is served on a lesson page too, not just the home page', async ({ page }) => {
    const headers = await headersFor(page, '/curso/colocando-seu-negocio-no-digital/');
    expect(headers['content-security-policy']).toContain("'wasm-unsafe-eval'");
  });
});

test.describe('cache headers from public/_headers', () => {
  test('fingerprinted /_astro/ assets are cached forever', async ({ page }) => {
    await page.goto('/');

    // Take a real asset URL off the page rather than guessing a build hash.
    const asset = await page
      .locator('link[rel="stylesheet"][href^="/_astro/"], script[src^="/_astro/"]')
      .first()
      .evaluate((el) => el.getAttribute('href') ?? el.getAttribute('src'));

    expect(asset, 'the home page loads no /_astro/ asset to check').toBeTruthy();

    const headers = await headersFor(page, asset as string);
    expect(headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  test('the service worker is never served stale', async ({ page }) => {
    const headers = await headersFor(page, '/sw.js');
    expect(headers['cache-control']).toBe('no-cache');
  });
});

test.describe('search under the production CSP', () => {
  /**
   * The regression test for bug 1, and the most valuable test in this file.
   *
   * Under `astro preview` this passed even with the broken CSP, because no CSP
   * was applied at all. Served through Wrangler it fails exactly the way
   * production failed: a CSP violation on the console, a CompileError from the
   * WASM module, and an empty result list.
   */
  test('a query returns results and raises no CSP violation', async ({ page }) => {
    const violations: string[] = [];

    const record = (message: string): void => {
      if (/WebAssembly|Content Security Policy|CompileError|wasm/i.test(message)) {
        violations.push(message);
      }
    };

    page.on('pageerror', (error) => record(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        record(`console.${message.type()}: ${message.text()}`);
      }
    });

    await page.goto('/buscar/?q=catalogo');

    const results = page.locator('[data-search-results] li');
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
    expect(await results.count()).toBeGreaterThan(0);

    await expect(page.locator('[data-search-status]')).toContainText(/resultado/i);

    expect(violations, `search emitted WebAssembly/CSP errors:\n${violations.join('\n')}`).toEqual(
      []
    );
  });
});

test.describe('internal links', () => {
  /**
   * Cloudflare 308-redirects `/curso/slug` to `/curso/slug/`, so a slash-less
   * internal link costs an extra round trip on every navigation — paid by an
   * audience on mobile data. The path helpers in src/lib/content.ts emit the
   * canonical trailing-slash form; this keeps a hand-written link from quietly
   * reintroducing the redirect.
   */
  for (const from of [
    '/',
    '/sobre/',
    '/curso/colocando-seu-negocio-no-digital/',
    '/curso/colocando-seu-negocio-no-digital/01-google-meu-negocio/',
    '/licenca/',
  ]) {
    test(`every internal link on ${from} resolves without a redirect`, async ({ page }) => {
      await page.goto(from);

      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) =>
          Array.from(new Set(links.map((a) => a.getAttribute('href') ?? '')))
        );

      expect(hrefs.length, `no internal links found on ${from}`).toBeGreaterThan(0);

      for (const href of hrefs) {
        const response = await page.request.get(href, { maxRedirects: 0 });
        expect(
          response.status(),
          `${href} answered ${response.status()} — it should be reached directly, not via a redirect`
        ).toBe(200);
      }
    });
  }
});

test.describe('missing URLs', () => {
  /**
   * The regression test for bug 2. Cloudflare Pages serves `dist/404.html` with a
   * real 404 status when it exists, and silently falls back to `index.html` at
   * HTTP 200 when it does not — a soft 404 that tells crawlers the page is fine.
   */
  test('a missing URL returns HTTP 404, not the home page at 200', async ({ page }) => {
    const response = await page.request.get('/curso/curso-que-nao-existe/');

    expect(response.status()).toBe(404);

    // `data-continue-section` only exists on the home page, so its absence is
    // proof the home page was not served in the 404's place.
    expect(await response.text()).not.toContain('data-continue-section');
  });

  test('the 404 page is rendered and offers a way back', async ({ page }) => {
    const response = await page.goto('/pagina-que-nao-existe/');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Não encontramos esta página'
    );
    await expect(page.getByRole('link', { name: 'Ver os cursos' })).toBeVisible();
  });
});
