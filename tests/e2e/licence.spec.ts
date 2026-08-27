import { expect, test } from '@playwright/test';

import { SITE } from '../../src/config/site';

/**
 * The /licenca page.
 *
 * These are not decorative copy tests. Two defects in the licensing statement
 * reached the footer and were caught only in review, and both are the kind that
 * a reuser acts on in good faith and gets wrong:
 *
 *   1. CC BY-NC-SA has THREE conditions. An earlier draft named only Attribution
 *      and NonCommercial. A teacher who adapts a worksheet has to be told that
 *      ShareAlike obliges them to release the adaptation under the same licence.
 *   2. AGPL-3.0 section 13 obliges an offer of Corresponding Source to the users
 *      who interact with that instance over a network — NOT publication to the
 *      world. Someone running a modified fork for a closed group owes those users
 *      the source; they do not owe the public a repository.
 *
 * Both regressions are silent: the page still renders, still reads fluently, and
 * is simply wrong about what the law requires. Hence tests.
 */

test.describe('the licence page', () => {
  test('is served at /licenca/ and names itself', async ({ page }) => {
    const response = await page.goto('/licenca/');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/licen/i);
  });

  test('spells out all three CC BY-NC-SA conditions, ShareAlike included', async ({ page }) => {
    await page.goto('/licenca/');

    const conditions = page.locator('[data-cc-conditions]');

    // The count is the guard. Defect 1 was a list of two that read perfectly
    // well; only counting catches a condition going missing again.
    await expect(conditions.getByRole('listitem')).toHaveCount(3);

    await expect(conditions).toContainText(/crédito/i); // BY
    await expect(conditions).toContainText(/comercia/i); // NC — "comercial" or "comerciais"
    await expect(conditions).toContainText(/mesma licença/i); // SA
  });

  test('states the AGPL network duty as an offer to that instance’s users, not publication to the world', async ({
    page,
  }) => {
    await page.goto('/licenca/');

    const clause = page.locator('[data-agpl-network-clause]');

    // The duty: offer the Corresponding Source to whoever uses your instance.
    await expect(clause).toContainText(/oferecer o código/i);
    await expect(clause).toContainText(/quem us/i);

    // Defect 2, stated as its own assertion so a failure names the mistake:
    // section 13 is not a duty to publish. Any phrasing that turns the offer into
    // "make the code public" overstates what the licence requires.
    await expect(clause).not.toContainText(/(deixar|tornar|publicar) o código.{0,30}públic/i);
  });

  test('offers an attribution a reuser can copy without having to compose one', async ({
    page,
  }) => {
    await page.goto('/licenca/');

    // Attribution is the one thing on this page a reuser has to *produce*, so a
    // prose description of BY is not enough — there has to be something to take.
    const model = page.locator('[data-attribution-model]');
    await expect(model).toBeVisible();

    const text = (await model.innerText()).replace(/\s+/g, ' ');

    // Drawn from SITE so a fork that repoints its identity gets a model that is
    // true of the fork, not a fossil of this deployment.
    expect(text).toContain(SITE.name);
    expect(text).toContain(SITE.url);
    expect(text).toContain('CC BY-NC-SA 4.0');
  });

  test('presents NonCommercial as a default permission can lift, not a refusal', async ({
    page,
  }) => {
    await page.goto('/licenca/');

    // Without this, NC silently forbids uses the author would happily allow — a
    // trade association or SEBRAE running a paid workshop off the worksheets. The
    // escape hatch only works if the reuser knows asking is on the table.
    const hatch = page.locator('[data-commercial-permission]');

    await expect(hatch).toContainText(/pergunt/i);
    await expect(hatch).toContainText(/recusa/i);
  });

  test('links out to both canonical licence texts and to the repository', async ({ page }) => {
    await page.goto('/licenca/');

    // The page paraphrases; a reuser who needs to rely on it must be able to
    // reach the operative text. The CC link is the pt-BR deed, not the English one.
    for (const href of [
      'https://www.gnu.org/licenses/agpl-3.0.html',
      'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-BR',
      SITE.repository,
    ]) {
      await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test('every external link is rel="noreferrer" only and stays in the same tab', async ({
    page,
  }) => {
    await page.goto('/licenca/');

    // Settled in review: noreferrer alone. noopener is inert with no
    // target="_blank" anywhere, and nothing here should open a new context.
    const externals = page.locator('main a[href^="http"]');
    const count = await externals.count();

    expect(count, 'the page has no external links to check').toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const link = externals.nth(i);
      const href = await link.getAttribute('href');

      expect(await link.getAttribute('rel'), `rel on ${href}`).toBe('noreferrer');
      expect(await link.getAttribute('target'), `target on ${href}`).toBeNull();
    }
  });

  test('answers "what may I do" and "what may I not do" without making the reader infer it', async ({
    page,
  }) => {
    await page.goto('/licenca/');

    const may = page.locator('[data-may]');
    const mayNot = page.locator('[data-may-not]');

    await expect(may).toContainText(/imprimir/i);
    await expect(may).toContainText(/adaptar/i);
    await expect(may).toContainText(/modificar/i); // the code, not just the content

    await expect(mayNot).toContainText(/vender/i);
    await expect(mayNot).toContainText(/paywall/i);
    await expect(mayNot).toContainText(/pago/i); // paid training
  });
});

test.describe('the footer licence line', () => {
  test('sends the reader to /licenca/ instead of restating the licences inline', async ({
    page,
  }) => {
    await page.goto('/');

    const licence = page.locator('footer [data-licence]');

    // Trailing slash: Cloudflare 308-redirects the slash-less form, and the
    // footer is on every page, so a slash-less link here would cost the whole
    // site an extra round trip. production-headers.spec.ts guards the general
    // case; this pins the specific link.
    await expect(licence.locator('a[href="/licenca/"]')).toHaveCount(1);
  });

  test('keeps the repository link, which is the AGPL section 13 offer a fork inherits', async ({
    page,
  }) => {
    await page.goto('/');

    // This link is the mechanism, not decoration: it lives in the shared footer
    // so a fork gets the offer of Corresponding Source by default rather than
    // having to remember to add one. Moving it to /licenca/ alone would mean a
    // fork's users only meet the offer if they go looking.
    await expect(page.locator(`footer a[href="${SITE.repository}"]`)).toHaveCount(1);
  });

  test('stays a lean one-liner instead of carrying the full statement', async ({ page }) => {
    // A character budget, deliberately, not a rendered height.
    //
    // The first version of this measured rendered line counts and the footer's share of the
    // viewport. It passed on Windows and failed on Ubuntu CI: the font stack resolves to Segoe UI
    // locally and to a wider face on the CI image, so identical text wrapped to a different number
    // of lines, and the footer came out 305px/33% there against 265px/29% here. Rendered layout is
    // font-dependent and therefore environment-dependent, which makes it a poor hard gate.
    //
    // The regression actually worth preventing is someone re-inlining the licence statement into
    // the footer instead of linking out, and that is visible in the text itself.
    await page.goto('/');
    const text = (await page.locator('footer [data-licence]').innerText())
      .replace(/\s+/g, ' ')
      .trim();

    // The inline statement this replaced ran to roughly 340 characters.
    expect(text.length, `footer licence text: "${text}"`).toBeLessThanOrEqual(160);

    // The three CC conditions belong on /licenca/. Spelling them out here is precisely what made
    // the old paragraph five lines on desktop and six on a phone.
    expect(text).not.toMatch(/mantenha a mesma licen/i);
  });
});
