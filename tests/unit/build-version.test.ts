import { describe, expect, it } from 'vitest';

import { resolveBuildVersion } from '@/lib/build-version';

/**
 * The build version is the only thing that distinguishes one deploy from another
 * once the files are on the CDN, so it has to be produced correctly on a developer's
 * machine, on Cloudflare Pages, and on a builder with no git at all.
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
   * The version is printed into an HTML attribute and written into a JSON file, and
   * more consumers will want it. Restricting it to lowercase alphanumerics and hyphens
   * keeps it safe in all of them without any escaping.
   */
  describe('the shape every consumer relies on', () => {
    const cases = [
      resolveBuildVersion({ env: { CF_PAGES_COMMIT_SHA: SHA } }),
      resolveBuildVersion({ env: {}, readHeadSha: () => SHA, readWorkingTreeDirty: () => true }),
      resolveBuildVersion({ env: {}, readHeadSha: () => null, now: () => 1_756_000_000_000 }),
    ];

    for (const version of cases) {
      it(`"${version}" is safe to use unescaped`, () => {
        expect(version).toMatch(/^[a-z0-9-]+$/);
        expect(version.length).toBeGreaterThan(0);
        expect(version.length).toBeLessThanOrEqual(32);
      });
    }
  });
});
