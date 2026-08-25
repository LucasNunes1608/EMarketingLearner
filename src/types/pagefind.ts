/**
 * Contract for the Pagefind runtime bundle.
 *
 * `/pagefind/pagefind.js` genuinely does not exist at type-check or build time —
 * the Pagefind CLI generates it afterwards by crawling the built HTML. An ambient
 * `declare module` cannot help here either, because TypeScript only accepts those
 * for bare module names, not absolute paths. So the search page imports through a
 * runtime specifier and casts to this interface: the contract stays explicit and
 * everything downstream of the cast is properly typed.
 *
 * Keep in sync with the Pagefind version pinned in package.json.
 */

export interface PagefindResultData {
  /** Site-relative URL of the matching page. */
  url: string;
  /** HTML excerpt with <mark> highlights around the matched terms. */
  excerpt: string;
  meta?: {
    title?: string;
    [key: string]: string | undefined;
  };
}

export interface PagefindResult {
  id: string;
  data(): Promise<PagefindResultData>;
}

export interface PagefindSearchResults {
  results: PagefindResult[];
}

export interface Pagefind {
  search(term: string): Promise<PagefindSearchResults>;
  options(config: Record<string, unknown>): Promise<void>;
}

/** Path the bundle is served from once `pagefind --site dist` has run. */
export const PAGEFIND_BUNDLE_URL = '/pagefind/pagefind.js';
