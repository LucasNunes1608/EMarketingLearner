# Certificates are produced by a print stylesheet, not a PDF library

The certificate page is styled for print and generated with `window.print()`, letting the
learner save it as a PDF through the browser. The obvious alternative, a client-side
library such as jsPDF, would add roughly 350 KB of JavaScript to serve an audience on
metered mobile data — for a document the browser can already produce.

## Consequences

The exact layout varies a little between browsers and paper sizes, which is an acceptable
trade for shipping no JavaScript at all. Do not "improve" this by adding a PDF library.
