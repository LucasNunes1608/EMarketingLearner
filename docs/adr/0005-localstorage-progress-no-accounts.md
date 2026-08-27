# Progress lives in localStorage; there are no accounts

Lesson completion is stored in the browser's `localStorage` and never leaves the device.
There is no sign-up, no login, no database and no cookie. A course platform without
accounts is unusual, so the reasoning is worth stating: accounts would require a backend
and a datastore, which breaks [ADR-0001](./0001-zero-marginal-cost-constraint.md), and they
would mean holding personal data on Brazilian citizens, bringing LGPD obligations that a
free, personally-funded project is poorly placed to meet.

Holding no personal data is both the cheapest and the safest position, and the footer
promises learners exactly that.

## Consequences

Progress does not follow a learner across devices or survive clearing site data, and a
learner who switches phones starts over. This is accepted. Note also that adding accounts
later cannot recover past progress — there is nothing on a server to migrate.
