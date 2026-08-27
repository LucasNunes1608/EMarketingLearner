# No third-party scripts run on this site

The Content-Security-Policy in `public/_headers` is `script-src 'self'` with `frame-src`
limited to `youtube-nocookie.com` and `img-src` to its thumbnail CDN. No analytics vendor,
tag manager, font host, chat widget or A/B tool is permitted at runtime. To keep this
enforceable, `astro.config.ts` sets `assetsInlineLimit: 0` so Astro never inlines a script
into the HTML, which would otherwise force `unsafe-inline` and void the policy.

This protects the promise made to learners that nothing about them is collected, and it
protects page weight for people on mobile data.

## Consequences

Any proposal to add a third-party embed is a change to this ADR, not a routine dependency
decision. The visible casualty is measurement — see
[ADR-0009](./0009-server-side-traffic-measurement-only.md).
