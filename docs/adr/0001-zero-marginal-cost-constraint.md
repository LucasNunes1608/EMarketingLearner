# Zero marginal cost is the primary architectural constraint

This platform is free to learners, will not be monetized, and is paid for personally, so
the design target is that serving one more learner costs nothing — not merely that hosting
is cheap. Every route is pre-rendered to static HTML (`output: 'static'`), with no server,
no database and no per-request compute anywhere in the system; the only recurring expense
is the domain, roughly R$40/year.

This constraint is the parent of most other ADRs here. When a future change is evaluated,
the question is not "is this affordable?" but "does this add a cost that grows with the
audience?" — because the platform has to survive succeeding.

## Consequences

Anything that scales with usage is excluded by default: server-rendered pages, a database,
user accounts, transactional email, hosted search, and paid video delivery. Features that
would normally lean on those are either solved on the learner's device or dropped.
