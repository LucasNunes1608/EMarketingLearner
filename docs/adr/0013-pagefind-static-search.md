# Search is a Pagefind index built at compile time

Pagefind builds a static search index during `npm run build` and queries it from files
served off the CDN, so search costs nothing and needs no server. The obvious alternative,
a hosted service such as Algolia, has a usable free tier but would require an account, an
API key in the client, and runtime requests to a third-party origin.

That last point is disqualifying rather than merely undesirable: it would mean widening
`connect-src` beyond `'self'` in [ADR-0007](./0007-no-third-party-runtime-scripts.md) and
sending every learner's search terms to a vendor.

## Consequences

The index ships to the client, so search weight grows with the amount of content. That is
fine at the current scale and worth re-measuring if the catalogue grows by an order of
magnitude — but the answer would be a smaller index, not a hosted service.
