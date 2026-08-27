import { execFileSync } from 'node:child_process';

/**
 * The identity of a deploy.
 *
 * Every file the CDN serves is anonymous once it leaves the build: two deploys look
 * identical from the outside, which is why a learner reading a cached page and the
 * author reading their bug report have no way to agree on what they are looking at.
 * This module produces one short string that answers "which build is this?", and it
 * is the single definition of that string for all three of its consumers:
 *
 *   1. `<meta name="build-version">` in BaseLayout — every page states its build.
 *   2. `dist/sw.js` — the service worker's cache name, so a deploy cannot reuse the
 *      previous deploy's cache. See `stampBuildVersion` for how it gets there.
 *   3. `dist/version.json` — `curl <site>/version.json` says what is actually live,
 *      without parsing HTML.
 *
 * It is deliberately deterministic: the same commit builds to the same version, so
 * the version in a bug report can be fed straight to `git show`. That also means a
 * rebuild of an unchanged commit reuses the same cache, which is correct — the bytes
 * are the same.
 *
 * This module runs at build time only. It is imported by `astro.config.ts` and by
 * component frontmatter, both of which execute in Node; nothing here is ever bundled
 * for the browser.
 */

/**
 * Commit SHA variables, in the order they are trusted.
 *
 * Cloudflare Pages sets `CF_PAGES_COMMIT_SHA` on every build. Reading it rather than
 * shelling out to git matters because a CI checkout may be shallow, detached, or —
 * on some build images — have no git binary at all.
 */
const COMMIT_SHA_VARIABLES = ['CF_PAGES_COMMIT_SHA', 'GITHUB_SHA'] as const;

/** Characters allowed in a version. Safe unescaped in a cache key, a JS string and an HTML attribute. */
const SAFE_VERSION = /^[a-z0-9-]+$/;

/** The literal that `stampBuildVersion` replaces in `public/sw.js`. */
export const BUILD_VERSION_PLACEHOLDER = '__BUILD_VERSION__';

/** How much of a commit SHA is kept. Eight hex digits stay unambiguous well past this project's size. */
const SHORT_SHA_LENGTH = 8;

export interface BuildVersionInputs {
  /** Build environment. Defaults to `process.env`. */
  env?: Record<string, string | undefined>;
  /** The commit SHA of HEAD, or null when git cannot answer. */
  readHeadSha?: () => string | null;
  /** Whether the working tree has uncommitted changes. Only consulted for a local git SHA. */
  readWorkingTreeDirty?: () => boolean;
  /** Wall clock. Only consulted when there is no SHA at all. */
  now?: () => number;
}

function runGit(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    // No git binary, not a repository, or a repository git refuses to read. All of
    // these are survivable: a version we cannot trace is better than a failed build.
    return null;
  }
}

function readHeadShaFromGit(): string | null {
  return runGit(['rev-parse', 'HEAD']);
}

function readWorkingTreeDirtyFromGit(): boolean {
  const status = runGit(['status', '--porcelain']);
  return status !== null && status.trim().length > 0;
}

function shortSha(sha: string): string {
  return sha.trim().toLowerCase().slice(0, SHORT_SHA_LENGTH);
}

/**
 * Work out the version for this build.
 *
 * Precedence: a CI-supplied commit SHA, then the local git checkout, then a
 * timestamp. Every probe is injectable so the logic can be tested without a git
 * repository and without a clock.
 */
export function resolveBuildVersion(inputs: BuildVersionInputs = {}): string {
  const {
    env = process.env,
    readHeadSha = readHeadShaFromGit,
    readWorkingTreeDirty = readWorkingTreeDirtyFromGit,
    now = Date.now,
  } = inputs;

  for (const variable of COMMIT_SHA_VARIABLES) {
    const supplied = env[variable]?.trim();
    // A CI checkout *is* the commit, so it is never marked dirty.
    if (supplied) return shortSha(supplied);
  }

  const head = readHeadSha()?.trim();
  if (head) return readWorkingTreeDirty() ? `${shortSha(head)}-dirty` : shortSha(head);

  // Nothing can identify the source, so identify the build instead. This gives up
  // determinism, which is the honest trade: a build we cannot trace to a commit is
  // already not reproducible, and a rotating cache name matters more than a stable one.
  return `untracked-${now().toString(36)}`;
}

let memoised: string | undefined;

/**
 * The version of the build currently running, resolved once.
 *
 * Memoised because component frontmatter calls it once per route, and spawning git
 * 28 times to learn the same answer would be silly.
 */
export function getBuildVersion(): string {
  memoised ??= resolveBuildVersion();
  return memoised;
}

/**
 * Write the version into a copy of the service worker source.
 *
 * `public/sw.js` is copied to `dist/` verbatim and is never processed by Vite, so a
 * build-time constant cannot be imported into it. Text substitution on the built copy
 * is the whole mechanism: `public/sw.js` keeps the placeholder and stays a valid,
 * working service worker on its own, and only `dist/sw.js` carries the real version.
 *
 * Both guards below turn silent breakage into a failed build. Losing the placeholder
 * would ship a worker whose cache name never changes again — the exact bug this
 * replaced — and a version containing a quote would close the string literal it is
 * written into.
 */
export function stampBuildVersion(source: string, version: string): string {
  if (!SAFE_VERSION.test(version)) {
    throw new Error(
      `Refusing to stamp an unsafe build version: ${JSON.stringify(version)}. ` +
        'A version must match /^[a-z0-9-]+$/.'
    );
  }

  if (!source.includes(BUILD_VERSION_PLACEHOLDER)) {
    throw new Error(
      `The service worker source contains no ${BUILD_VERSION_PLACEHOLDER} placeholder, ` +
        'so its cache name would never change between deploys.'
    );
  }

  return source.split(BUILD_VERSION_PLACEHOLDER).join(version);
}
