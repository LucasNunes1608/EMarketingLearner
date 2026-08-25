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
  url: 'https://negociodigital.example.com',
  locale: 'pt-BR',
  /** Used as the <html lang> attribute. */
  lang: 'pt-BR',
  author: 'Negócio Digital',
  /** Optional social/contact links. Empty strings are hidden from the footer. */
  links: {
    youtube: '',
    instagram: '',
    whatsapp: '',
  },
} as const;

export type Site = typeof SITE;
