# Published slugs are permanent identifiers

A course or lesson slug is the primary key of learner progress, not merely a URL segment.
Progress lives only in the browser ([ADR-0005](./0005-localstorage-progress-no-accounts.md))
and `isLessonComplete` matches those slug strings literally, so renaming a published slug
orphans every completion recorded against it — silently, and with no server-side copy to
restore from. Once a course or lesson has shipped, therefore, its slug is frozen: the
`title` may be reworded freely, but the file name does not change.
`tests/unit/published-slugs.test.ts` pins the published slugs so that this fails a build
rather than a learner.

Giving each lesson a stable opaque id decoupled from its URL is the textbook fix, and is
rejected twice over: it does not help retroactively, since v1 progress is already keyed by
slug and adopting ids would need exactly the migration it claims to avoid; and it only
moves the permanence, because the opaque id then becomes the thing that must never change,
while adding a second identifier for authors to keep in sync. A permanent old-to-new alias
map was rejected on cost — it would have to be consulted on every progress read and kept
forever, since any device may still hold the old string, all to support an event that
should approach never.

## Consequences

The honest cost is that a badly chosen slug is permanent, so slugs have to be chosen
carefully while authoring: before the first publish is the only cheap moment to change one.
A rename that genuinely must happen stops being a file rename and becomes a code change — a
`PROGRESS_VERSION` bump and a branch in `migrate()` that rewrites the old slug in stored
state — and that branch can never be deleted afterwards, because a learner may return to
the site after years away.
