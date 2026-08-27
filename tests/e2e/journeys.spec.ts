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

/**
 * Footer licensing. The statement itself moved to /licenca/ when the inline copy
 * grew to 38% of a phone viewport, so what the footer owes is narrower now: the
 * offer of source on every route, and a way through to the detail.
 *
 * The accuracy guards that used to live here — all three CC conditions, and
 * section 13 as an offer rather than publication — moved with the prose to
 * tests/e2e/licence.spec.ts, where they assert against the text a reuser actually
 * reads and are stronger for it.
 */
test.describe('licensing', () => {
  test('the footer offers the source and points at the licence detail', async ({ page }) => {
    await page.goto('/');
    const licence = page.locator('[data-licence]');

    await expect(licence).toBeVisible();
    await expect(licence.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      /^https:\/\/github\.com\/.+/
    );
    await expect(licence.getByRole('link', { name: /licença e reúso/i })).toHaveAttribute(
      'href',
      '/licenca/'
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

  test('external licence links send no referrer', async ({ page }) => {
    await page.goto('/');

    // Scoped to external links: the footer now also holds an internal link to
    // /licenca/, and rel="noreferrer" on a same-origin link buys nothing.
    const links = page.locator('[data-licence] a[href^="http"]');

    await expect(links).not.toHaveCount(0);
    for (const link of await links.all()) {
      // noreferrer only. noopener is inert without target="_blank" and nothing here opens a new
      // context. This is not redundant with Referrer-Policy, which still sends the origin.
      await expect(link).toHaveAttribute('rel', 'noreferrer');
    }
  });
});

test.describe('about page', () => {
  test('the site navigation reaches it from anywhere', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name: 'Sobre' })
      .click();

    await expect(page).toHaveURL(/\/sobre\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sobre');
  });

  /**
   * The page exists to answer "why is this free, and what is the catch?" for an audience
   * that meets a lot of digital-marketing scams. The running cost is the one answer that is
   * concrete and checkable, so it must survive any future rewrite of the copy.
   */
  test('says what the site costs to run, not just that it is free', async ({ page }) => {
    await page.goto('/sobre/');

    const cost = page.locator('[data-running-cost]');
    await expect(cost).toBeVisible();
    // \s+ rather than a literal space: a regex is matched against the raw text, which
    // still carries the source's line wrapping.
    await expect(cost).toContainText(/R\$\s?40\s+por\s+ano/i);
  });

  test('promises no signup, no fee and no data collection', async ({ page }) => {
    await page.goto('/sobre/');

    const main = page.locator('main');
    await expect(main).toContainText(/sem cadastro/i);
    await expect(main).toContainText(/mensalidade/i);
    await expect(main).toContainText(/aparelho/i);
  });

  /**
   * What a learner will be able to do is taken from the published courses rather than
   * described again by hand, so the promise cannot drift away from the curriculum.
   */
  test('lists the published courses and links to each one', async ({ page }) => {
    await page.goto('/sobre/');

    const courses = page.locator('[data-about-courses] li');
    await expect(courses).toHaveCount(2);
    await expect(
      page.locator('[data-about-courses] a[href="/curso/colocando-seu-negocio-no-digital/"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-about-courses] a[href="/curso/vendendo-mais-no-whatsapp/"]')
    ).toBeVisible();
  });

  test('names the author and offers LinkedIn as the way to reach him', async ({ page }) => {
    await page.goto('/sobre/');

    const author = page.locator('[data-author]');
    await expect(author).toContainText('Lucas Nunes');

    const linkedin = author.getByRole('link', { name: /LinkedIn/i });
    await expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/lucasmnunesk/');
  });

  /**
   * His email is known and deliberately withheld: publishing a personal contact detail on a
   * public page is his call, not ours. LinkedIn is the contact route.
   */
  test('publishes no personal email address', async ({ page }) => {
    await page.goto('/sobre/');

    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/@gmail\.com/i);
  });

  /**
   * Regression guard. The first draft claimed 'o YouTube nem é acionado' before play, which is
   * false: VideoPlayer paints the poster from i.ytimg.com as a CSS background on page load, so
   * YouTube receives the learner's IP before any click. Verified against production. On the page
   * whose whole job is earning trust, an overstated privacy claim is the worst kind to get wrong,
   * so the copy must keep naming the cover image rather than promising zero contact.
   */
  test('the privacy section does not overstate the video facade', async ({ page }) => {
    await page.goto('/sobre/');
    const body = page.locator('body');

    await expect(body).toContainText('imagem de capa');
    await expect(body).not.toContainText(/YouTube nem é acionado/i);
  });

  /**
   * Same convention as the footer: rel="noreferrer" and nothing else. noopener is inert
   * without target="_blank", and no link on this site opens a new context.
   */
  test('every outbound link sends no referrer and stays in the same tab', async ({ page }) => {
    await page.goto('/sobre/');

    const external = page.locator('main a[href^="http"]');
    await expect(external).not.toHaveCount(0);

    for (const link of await external.all()) {
      await expect(link).toHaveAttribute('rel', 'noreferrer');
      expect(await link.getAttribute('target')).toBeNull();
    }
  });
});
