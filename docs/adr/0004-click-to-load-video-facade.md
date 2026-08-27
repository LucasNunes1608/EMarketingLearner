# Video is a click-to-load facade, not an embedded iframe

A lesson page renders a poster image and a play button; the YouTube iframe is injected only
when the learner clicks it. A normal embed would load several hundred kilobytes of
third-party JavaScript and set cookies on page load, before the learner has chosen to watch
anything.

The audience is on mobile data and low-end Android devices, so those bytes are a real cost
to them, and the tracking is a cost we do not want to impose by default.

## Consequences

This looks like an unfinished embed. It is not — replacing it with a plain `<iframe>` would
be a regression in page weight and in the privacy posture described in
[ADR-0007](./0007-no-third-party-runtime-scripts.md).
