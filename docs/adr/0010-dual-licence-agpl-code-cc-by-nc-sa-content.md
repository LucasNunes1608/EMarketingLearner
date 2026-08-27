# The code is AGPL-3.0; the course content is CC BY-NC-SA 4.0

The repository carries two licences, because it holds two different kinds of asset. Everything
outside `src/content/` is AGPL-3.0-only; everything inside it — the lessons, courses and
printable worksheets — is CC BY-NC-SA 4.0. `NOTICE` at the root states the split in plain
English, and `package.json` declares only `AGPL-3.0-only`, since that field describes the npm
package, which is code.

The reasoning is that the code is not the moat and the content is. A static Astro site is
worth reading and reusing, and we want people to be able to learn from it; the Portuguese
prose and the teaching sequence are the part that took the real work, and they are meant to
stay free for the shop owners they were written for. AGPL rather than plain GPL-3.0 for a
specific reason: nobody _distributes_ a website, they serve it, so GPL's copyleft would never
be triggered by the exact reuse we care about. AGPL treats serving as distribution and closes
that loophole.

MIT — the previous declaration — was rejected because it permits precisely the outcome we
want to prevent: a fork sold as a paid product with nothing given back. MPL-2.0 was rejected
because its file-level copyleft is too weak here; a reuser could keep our files unchanged and
build a proprietary product around them. CC BY-SA was rejected for the content because
ShareAlike alone still permits commercial repackaging, and the NonCommercial term is the
whole point of the split.

## Consequences

Two honest downsides. First, NonCommercial is ambiguous by Creative Commons' own admission —
the line between commercial and non-commercial use is not crisp, and that ambiguity lands on
good-faith reusers, who are exactly the people least likely to chance it. Second, it blocks
uses this project might actually want: a trade association or SEBRAE running a paid workshop
from our worksheets is a good outcome for our learners and is nevertheless forbidden by
default. That is accepted on the basis that permission can be granted case by case, and
`NOTICE` says so explicitly.

Note also what a licence is not. It is recourse, not prevention — it gives a basis to object
after the fact and does nothing to stop a copy being made. Anyone determined to lift the
content will, and no licence choice changes that.
