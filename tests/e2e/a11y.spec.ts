import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Automated accessibility checks.
 *
 * Axe catches roughly a third of WCAG issues — it is a regression net, not a
 * substitute for judgement. Anything it cannot see (focus order, meaningful alt
 * text, whether the Portuguese actually reads clearly) still needs a human.
 *
 * Only `serious` and `critical` violations fail the build. Lower severities are
 * printed so they stay visible without blocking work on false positives.
 */

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const COURSE = '/curso/colocando-seu-negocio-no-digital';

const PAGES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/' },
  { name: 'course', path: COURSE },
  { name: 'lesson', path: `${COURSE}/01-google-meu-negocio` },
  { name: 'worksheet', path: '/ficha/01-google-meu-negocio' },
  { name: 'search', path: '/buscar' },
  { name: 'certificate (locked)', path: '/certificado/colocando-seu-negocio-no-digital' },
  { name: 'offline fallback', path: '/offline' },
];

for (const { name, path } of PAGES) {
  test(`${name} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path);

    const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    if (results.violations.length > 0) {
      console.log(
        `axe findings on ${name}:`,
        results.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length})`)
      );
    }

    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.help} — ${v.nodes[0]?.html ?? ''}`).join('\n')
    ).toEqual([]);
  });
}

test('the certificate is accessible once unlocked', async ({ page }) => {
  const slugs = [
    '01-google-meu-negocio',
    '02-whatsapp-business',
    '03-instagram-que-vende',
    '04-pix-e-pagamentos',
    '05-fotos-com-o-celular',
    '06-conteudo-que-atrai-cliente',
  ];

  for (const slug of slugs) {
    await page.goto(`${COURSE}/${slug}`);
    await page.getByRole('button', { name: /Marcar aula como concluída/i }).click();
  }

  await page.goto('/certificado/colocando-seu-negocio-no-digital');
  await expect(page.locator('[data-certificate-unlocked]')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );

  expect(blocking, blocking.map((v) => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
});

test('the video player is reachable and operable by keyboard alone', async ({ page }) => {
  await page.goto(`${COURSE}/01-google-meu-negocio`);

  const play = page.getByRole('button', { name: /Assistir ao vídeo/i });
  await play.focus();
  await expect(play).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('[data-video-facade] iframe')).toHaveCount(1);
});

test('the skip link is the first focusable element and targets the main content', async ({
  page,
}) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');

  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#conteudo');
  await expect(page.locator('#conteudo')).toHaveCount(1);
});

test('every page declares Brazilian Portuguese', async ({ page }) => {
  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  }
});

test('pages ship almost no JavaScript before the learner interacts', async ({ page }) => {
  let scriptBytes = 0;

  page.on('response', async (response) => {
    const type = response.headers()['content-type'] ?? '';
    if (!type.includes('javascript')) return;
    if (new URL(response.url()).origin !== new URL(page.url() || 'http://localhost').origin) {
      return;
    }
    try {
      scriptBytes += (await response.body()).length;
    } catch {
      /* body already consumed or redirected */
    }
  });

  await page.goto(`${COURSE}/01-google-meu-negocio`);
  await page.waitForLoadState('networkidle');

  // Budget guard. The whole point of the facade is that a lesson page costs a few
  // KB, not the ~1 MB a YouTube embed would pull in. If this fails, something
  // heavy was added — check it is worth the mobile data before raising the limit.
  expect(scriptBytes).toBeLessThan(100 * 1024);
});
