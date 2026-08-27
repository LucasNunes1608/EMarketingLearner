# YouTube hosts the video, behind a provider seam

Video is the one part of this platform with a genuinely large cost if self-hosted, and
YouTube delivers it worldwide for free. It is also the weakest link in the design: it is
the only third party in the critical path, it shows its own branding, and its terms are
outside our control.

So the dependency is deliberately kept swappable. `videoSourceSchema` in `src/lib/schemas.ts`
is a discriminated union that already carries an `hls` arm alongside `youtube`, even though
only `youtube` is implemented. Migrating to self-hosted video on Cloudflare R2 is therefore
an additive change — add the player branch, change the frontmatter — rather than a rewrite.

## Consequences

The `hls` arm is intentionally dead code. Do not delete it as unused; it is the escape hatch
that makes accepting the YouTube dependency reasonable.
