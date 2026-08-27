# Cloudflare Pages as the deployment target

Static hosting is commodity, but free bandwidth is not: Netlify and Vercel both meter it on
their free tiers, which turns a popular lesson into a bill. Cloudflare Pages serves static
assets with unmetered bandwidth at no cost, which is the one property that matters under
[ADR-0001](./0001-zero-marginal-cost-constraint.md).

## Consequences

The build output is portable, but the edge configuration is not: `public/_headers` uses
Cloudflare's syntax for the Content-Security-Policy and cache rules. Moving hosts means
rewriting that file for the new provider's header mechanism — a contained cost, and the
only real lock-in accepted here.
