/**
 * Single source of truth for brand + deployment identity.
 *
 * Renaming the project is a one-file change: edit the values here and every page
 * title, meta tag, sitemap entry and certificate picks it up.
 */
export const SITE = {
  /** Public brand name shown to learners. */
  name: 'Negócio Digital',
  /** Short tagline used in the hero and in Open Graph descriptions. */
  tagline: 'Aprenda de graça a colocar seu negócio no digital',
  description:
    'Cursos gratuitos e práticos para quem toca o próprio negócio. Sem mensalidade, sem cadastro, sem enrolação.',
  /**
   * Canonical origin. MUST be updated before the first production deploy —
   * it drives the sitemap, canonical URLs and Open Graph tags.
   */
  url: 'https://negociodigital.pages.dev',
  locale: 'pt-BR',
  /** Used as the <html lang> attribute. */
  lang: 'pt-BR',
  author: 'Negócio Digital',
  /**
   * Public source repository, offered in the footer.
   *
   * This is the AGPL-3.0 section 13 offer of Corresponding Source: serving a
   * modified version of this site over a network obliges you to give its users
   * the source of YOUR version. If you fork this project, repoint this at your
   * own repository — leaving it pointing here does not discharge the duty.
   */
  repository: 'https://github.com/LucasNunes1608/EMarketingLearner',
  /** Optional social/contact links. Empty strings are hidden from the footer. */
  links: {
    youtube: '',
    instagram: '',
    whatsapp: '',
  },
} as const;

export type Site = typeof SITE;
