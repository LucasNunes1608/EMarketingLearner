import { expect, test } from '@playwright/test';

/**
 * End-to-end journeys, run against the real static build (see playwright.config.ts).
 * What CI verifies here is byte-for-byte what Cloudflare Pages will serve.
 */

const COURSE = '/curso/colocando-seu-negocio-no-digital';
const LESSON_1 = `${COURSE}/01-google-meu-negocio`;
const LESSON_SLUGS = [
  '01-google-meu-negocio',
  '02-whatsapp-business',
  '03-instagram-que-vende',
  '04-pix-e-pagamentos',
  '05-fotos-com-o-celular',
  '06-conteudo-que-atrai-cliente',
];

test.describe('catalog and navigation', () => {
  test('a learner can go from the home page into the first lesson', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Começar agora' }).click();

    await expect(page).toHaveURL(new RegExp(`${COURSE}/?$`));
    await expect(page.getByRole('heading', { name: /Colocando seu negócio/i })).toBeVisible();

    await page
      .getByRole('link', { name: /Google Meu Negócio/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Google Meu Negócio');
  });

  test('the course page lists every published lesson', async ({ page }) => {
    await page.goto(COURSE);
    for (const slug of LESSON_SLUGS) {
      await expect(page.locator(`a[href$="${slug}/"]`).first()).toBeVisible();
    }
  });

  test('lesson pages link forward and back', async ({ page }) => {
    await page.goto(`${COURSE}/02-whatsapp-business`);

    await expect(page.locator('a[rel="prev"]')).toHaveAttribute('href', /01-google-meu-negocio/);
    await expect(page.locator('a[rel="next"]')).toHaveAttribute('href', /03-instagram-que-vende/);
  });

  test('the last lesson offers a way back to the course instead of a dead end', async ({
    page,
  }) => {
    await page.goto(`${COURSE}/06-conteudo-que-atrai-cliente`);
    await expect(page.locator('a[rel="next"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Voltar para o curso/i })).toBeVisible();
  });
});

test.describe('video facade', () => {
  test('no YouTube iframe exists before the learner presses play', async ({ page }) => {
    await page.goto(LESSON_1);
    await expect(page.locator('iframe')).toHaveCount(0);
  });

  test('no embed request reaches YouTube until play is pressed', async ({ page }) => {
    const embedRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/embed/')) embedRequests.push(request.url());
    });

    await page.goto(LESSON_1);
    await page.waitForLoadState('networkidle');

    expect(embedRequests).toEqual([]);
  });

  test('pressing play swaps in a no-cookie iframe and moves focus into it', async ({ page }) => {
    await page.goto(LESSON_1);

    await page.getByRole('button', { name: /Assistir ao vídeo/i }).click();

    const iframe = page.locator('[data-video-facade] iframe');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com/);
    await expect(iframe).toHaveAttribute('title', /Google Meu Negócio/);

    const src = await iframe.getAttribute('src');
    expect(src).not.toMatch(/\/\/(www\.)?youtube\.com/);

    await expect(iframe).toBeFocused();
  });
});

test.describe('progress tracking', () => {
  test('marking a lesson complete survives a reload', async ({ page }) => {
    await page.goto(LESSON_1);

    const button = page.getByRole('button', { name: /Marcar aula como concluída/i });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();

    await expect(page.getByRole('button', { name: /Aula concluída/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.reload();
    await expect(page.getByRole('button', { name: /Aula concluída/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('completing a lesson is reflected on the course page', async ({ page }) => {
    await page.goto(LESSON_1);
    await page.getByRole('button', { name: /Marcar aula como concluída/i }).click();

    await page.goto(COURSE);
    await expect(page.locator('[data-progress-label]')).toContainText('1 de 6');
    await expect(page.locator('[data-progress-bar]')).toHaveAttribute('aria-valuenow', '17');
  });

  test('a lesson can be un-marked', async ({ page }) => {
    await page.goto(LESSON_1);
    await page.getByRole('button', { name: /Marcar aula como concluída/i }).click();
    await page.getByRole('button', { name: /Aula concluída/i }).click();

    await expect(page.getByRole('button', { name: /Marcar aula como concluída/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  test('"continue de onde parou" appears on the home page after visiting a lesson', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-continue-section]')).toBeHidden();

    await page.goto(LESSON_1);
    await page.goto('/');

    const section = page.locator('[data-continue-section]');
    await expect(section).toBeVisible();
    await expect(section.locator('[data-continue-title]')).toContainText('Google Meu Negócio');
    await expect(section.locator('[data-continue-link]')).toHaveAttribute(
      'href',
      /01-google-meu-negocio/
    );
  });

  test('progress starts empty in a fresh browser context', async ({ page }) => {
    await page.goto(COURSE);
    await expect(page.locator('[data-progress-label]')).toContainText('ainda não começou');
    await expect(page.locator('[data-certificate-link]')).toBeHidden();
  });
});

test.describe('certificate', () => {
  test('is locked until every lesson is complete', async ({ page }) => {
    await page.goto('/certificado/colocando-seu-negocio-no-digital');
    await expect(page.locator('[data-certificate-locked]')).toBeVisible();
    await expect(page.locator('[data-certificate-unlocked]')).toBeHidden();
  });

  test('unlocks after all six lessons and prints the learner name', async ({ page }) => {
    for (const slug of LESSON_SLUGS) {
      await page.goto(`${COURSE}/${slug}`);
      await page.getByRole('button', { name: /Marcar aula como concluída/i }).click();
    }

    await page.goto(COURSE);
    await expect(page.locator('[data-progress-label]')).toContainText('concluiu as 6 aulas');
    await expect(page.getByRole('link', { name: /Emitir meu certificado/i })).toBeVisible();

    await page.goto('/certificado/colocando-seu-negocio-no-digital');
    await expect(page.locator('[data-certificate-unlocked]')).toBeVisible();

    await page.getByLabel('Seu nome completo').fill('Maria da Silva');
    await expect(page.locator('[data-certificate-name]')).toHaveText('Maria da Silva');

    // The name is part of stored progress, so it must survive a reload.
    await page.reload();
    await expect(page.locator('[data-certificate-name]')).toHaveText('Maria da Silva');
  });
});

test.describe('search', () => {
  test('finds a lesson by a word from its body', async ({ page }) => {
    await page.goto('/buscar');
    await page.getByLabel(/O que você quer aprender/i).fill('Pix');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.locator('[data-search-results] li').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-search-status]')).toContainText(/resultado/i);
  });

  test('supports deep-linking a query', async ({ page }) => {
    await page.goto('/buscar?q=whatsapp');
    await expect(page.locator('[data-search-results] li').first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('reports honestly when nothing matches', async ({ page }) => {
    await page.goto('/buscar');
    await page.getByLabel(/O que você quer aprender/i).fill('zyxwvutsrq');
    await page.getByRole('button', { name: 'Buscar' }).click();
    await expect(page.locator('[data-search-status]')).toContainText(/Nenhum resultado/i, {
      timeout: 15_000,
    });
  });
});

test.describe('offline support', () => {
  test('a visited lesson still renders its text with the network cut', async ({
    page,
    context,
  }) => {
    await page.goto(LESSON_1);
    // Let the service worker install and cache this navigation.
    await page.waitForTimeout(2000);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Google Meu Negócio');
    await expect(page.getByText('Passo a passo')).toBeVisible();

    await context.setOffline(false);
  });
});

test.describe('licensing', () => {
  const AGPL = 'https://www.gnu.org/licenses/agpl-3.0.html';
  const CC = 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pt-BR';

  test('the footer offers the source and names the licence over each half of the site', async ({
    page,
  }) => {
    await page.goto('/');
    const licence = page.locator('[data-licence]');

    await expect(licence).toBeVisible();
    await expect(licence.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      /^https:\/\/github\.com\/.+/
    );
    await expect(licence.getByRole('link', { name: 'AGPL-3.0' })).toHaveAttribute('href', AGPL);
    await expect(licence.getByRole('link', { name: 'CC BY-NC-SA 4.0' })).toHaveAttribute(
      'href',
      CC
    );
  });

  /**
   * The load-bearing assertion for AGPL section 13. The offer of Corresponding
   * Source lives in the shared footer precisely so that it reaches every route of
   * every fork without anyone having to remember to add it.
   */
  test('the source offer reaches every kind of page', async ({ page }) => {
    const paths = [
      '/',
      COURSE,
      LESSON_1,
      '/ficha/01-google-meu-negocio',
      '/buscar',
      '/certificado/colocando-seu-negocio-no-digital',
      '/offline',
    ];

    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('[data-licence] a[href*="github.com"]')).toHaveCount(1);
    }
  });

  test('licence links send no referrer', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('[data-licence] a');

    await expect(links).not.toHaveCount(0);
    for (const link of await links.all()) {
      // noreferrer only. noopener is inert without target="_blank" and nothing here opens a new
      // context. This is not redundant with Referrer-Policy, which still sends the origin.
      await expect(link).toHaveAttribute('rel', 'noreferrer');
    }
  });

  /**
   * Regression guard. Review caught the first draft stating only two of CC BY-NC-SA's three
   * conditions and overstating AGPL section 13 as publication to the world. Both understate or
   * misstate the licences to a reuser, which is a legal defect rather than a wording nitpick.
   */
  test('the summary states every licence condition accurately', async ({ page }) => {
    await page.goto('/');
    const licence = page.locator('[data-licence]');

    await expect(licence).toContainText('dê crédito');
    await expect(licence).toContainText('fins comerciais');
    await expect(licence).toContainText('mantenha a mesma licença');

    // Section 13 obliges an offer to that instance's users, not publication to the world.
    await expect(licence).toContainText('oferecer o código');
  });
});
