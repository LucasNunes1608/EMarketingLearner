# Measurement is server-side traffic only, and cannot cover learning

Audience measurement is limited to Cloudflare's zone-level request analytics, which is
free, requires no beacon script and needs no change to the Content-Security-Policy in
[ADR-0007](./0007-no-third-party-runtime-scripts.md). No client-side analytics is added,
including Cloudflare's own Web Analytics beacon, which would mean admitting a third-party
script origin.

## Consequences

This is a real and deliberate blind spot, and it should be named rather than rediscovered.
Because progress lives only on the learner's device
([ADR-0005](./0005-localstorage-progress-no-accounts.md)), lesson completion and drop-off
are not merely unmeasured but structurally unmeasurable — so the project's actual goal,
whether the teaching works, cannot be evaluated from data. Judging that will have to come
from talking to learners directly.
