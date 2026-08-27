# Service worker updates take effect immediately, without asking

A new build stamps a new cache name into `sw.js`, so every deploy installs a fresh worker.
That worker calls `skipWaiting()` and `clients.claim()`, taking over open pages at once
instead of waiting for every tab to close, and it does so silently rather than offering the
learner an "update available" prompt.

Taking over immediately is safe here in a way it usually is not. The classic hazard — a page
left holding new HTML and stale assets — cannot produce wrong bytes, because `/_astro/*` is
content-hashed, so a mismatch can only be a miss. Pages fetch almost nothing after load, and
navigations are network-first, so the next page view is a clean build regardless. Waiting
instead would let a single pinned tab keep an old worker, and its frozen cache, alive
indefinitely — which is the failure this whole mechanism exists to end.

The prompt was rejected on cost. It would need client JavaScript, a translated string and
focus handling, against a 100 KB JS budget and a CSP that forbids inline script — to tell a
shop owner something their next tap already fixes.

## Consequences

A learner mid-page can have the worker swapped underneath them. That is invisible in
practice, because nothing on these pages depends on the worker's identity after load.

Anything added later that _does_ — a background sync, a cached POST queue, an interactive
feature holding worker state — invalidates the reasoning above rather than merely
complicating it, and should revisit this decision instead of working around it.
