# If donations are ever added, they must be a static surface

The project is not monetized and donations are not expected, but the possibility keeps
coming up, so the constraint is recorded before anyone acts on it. Should a donation
channel be added, it must be a static outbound link or a Pix key with a QR image generated
at build time — never an embedded payment widget.

Ko-fi, PayPal and Stripe embeds all require relaxing the Content-Security-Policy in
[ADR-0007](./0007-no-third-party-runtime-scripts.md) and reintroduce third-party cookies to
a site whose footer tells learners no data is stored about them. Trading that promise for
income nobody is counting on is a bad bargain.

## Consequences

Nothing is built for this today. If a Pix key is published later, use a _chave aleatória_
rather than a CPF or phone number, so a personal identifier is not put on a public page.
