# Negócio Digital

A free video-course platform teaching Brazilian small entrepreneurs — MEIs, shop
owners, autônomos — practical digital skills.

The whole design serves one constraint: **learners must never pay, and the site must
cost effectively nothing to run at any traffic level.** Every architectural decision
below falls out of that.

- **Static Astro site** — no server, no database, no compute bill.
- **Video on YouTube**, embedded through a click-to-load facade — free bandwidth,
  and nothing loads from YouTube until a learner presses play.
- **Progress in `localStorage`** — no accounts, no backend, no cookies, no LGPD burden.
- **Search via Pagefind** — a static index built at compile time, no search server.
- **Offline support** — a hand-written service worker, because the audience is on
  unreliable mobile data.
- **Portuguese (pt-BR)** throughout the learner-facing UI. Code and docs are English.

---

## Running cost

| Line item                                     | Monthly                 |
| --------------------------------------------- | ----------------------- |
| Cloudflare Pages (static hosting + bandwidth) | R$0 — unlimited         |
| YouTube video storage + delivery              | R$0 — unlimited         |
| Pagefind search                               | R$0 — static, no server |
| Progress storage                              | R$0 — learner's device  |
| GitHub Actions CI                             | R$0 — free tier         |
| Domain (`.com.br` via registro.br)            | ~R$3,30 (R$40/year)     |
| **Marginal cost per additional learner**      | **R$0**                 |

The only real bill is the domain. Serving one learner and serving fifty thousand cost
the same, which is what makes a free platform sustainable rather than a liability that
grows with its own success.

---

## Quickstart

Requires **Node 20.11+** (the repo pins Node 24 in `.nvmrc`).

```bash
git clone <your-repo-url> EMarketingLearner
cd EMarketingLearner
npm install
npm run dev            # http://localhost:4321
```

To run exactly what production serves — including search, which needs the built index:

```bash
npm run build
npm run preview        # http://localhost:4321
```

> Search does not work under `npm run dev`. The Pagefind index is generated from the
> built HTML, so it only exists after `npm run build`. The search page says so on
> screen rather than failing silently.

### Scripts

| Command            | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | Dev server with hot reload                                       |
| `npm run build`    | Static build to `dist/`, then builds the Pagefind search index   |
| `npm run preview`  | Serve the built site locally                                     |
| `npm test`         | Unit tests (Vitest)                                              |
| `npm run test:e2e` | End-to-end + accessibility tests (Playwright; builds first)      |
| `npm run check`    | TypeScript / Astro type-check                                    |
| `npm run lint`     | ESLint                                                           |
| `npm run format`   | Prettier write                                                   |
| `npm run icons`    | Regenerate PWA PNG icons from SVG                                |
| `npm run verify`   | format:check → lint → check → test → build (the full local gate) |

First E2E run only, install the browser:

```bash
npx playwright install chromium
```

---

## Adding content

Content is plain files in `src/content/`. There is no CMS and no admin login — you
edit Markdown and push. See **[CONTENT.md](./CONTENT.md)** for the full authoring guide.

```
src/content/
├── courses/
│   └── colocando-seu-negocio-no-digital.md      # course metadata
├── lessons/
│   └── colocando-seu-negocio-no-digital/        # one directory per course
│       ├── 01-google-meu-negocio.mdx
│       └── …
└── worksheets/
    └── 01-google-meu-negocio.md                 # printable exercise
```

Everything is validated by Zod at build time (`src/lib/schemas.ts`), so a malformed
video ID, a lesson pointing at a course that does not exist, or two lessons claiming
the same position **fails the build** instead of shipping a broken page.

### Swapping in your real videos

The seed curriculum ships with placeholder video IDs (`AULA0000001`…`AULA0000006`).
They are format-valid so the build passes, and obviously fake so nobody mistakes them
for real footage.

To publish a real video:

1. Upload it to YouTube. **Unlisted** is the right setting — it keeps the video out of
   YouTube's public listings while remaining embeddable here.
2. Copy the 11-character ID from the URL: `https://youtu.be/`**`dQw4w9WgXcQ`**
3. Paste it into the lesson's frontmatter and set the real runtime:

```yaml
video:
  provider: 'youtube'
  id: 'dQw4w9WgXcQ'
durationSeconds: 512
```

4. `npm run build`. If the ID is malformed, the build fails with a clear message.

---

## Deploying to Cloudflare Pages

Nothing here needs credentials from anyone but you.

1. **Set your domain** in `src/config/site.ts` — change `url` to your real origin.
   It drives canonical URLs, Open Graph tags, the sitemap, and `robots.txt`.
2. Push the repo to GitHub.
3. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**,
   and pick the repo.
4. Build settings:

   | Field                  | Value           |
   | ---------------------- | --------------- |
   | Framework preset       | Astro           |
   | Build command          | `npm run build` |
   | Build output directory | `dist`          |
   | Node version           | `24`            |

5. **Save and Deploy.** Cloudflare rebuilds on every push to `main`.
6. Add your custom domain under **Custom domains**. A `.com.br` from
   [registro.br](https://registro.br) is ~R$40/year — the only recurring cost.

`public/_headers` is picked up automatically and applies security headers plus
long-lived caching for fingerprinted assets.

### After the first deploy

- Confirm `https://your-domain/robots.txt` shows the right sitemap URL. If it still
  says `example.com`, step 1 was missed.
- Add three PNG icons if you rebrand: `npm run icons` regenerates them from the
  inline SVG in `scripts/generate-icons.mjs`.

---

## Architecture notes

### The video facade is the centrepiece

`src/components/VideoPlayer.astro` renders a poster and a play button. **No iframe, no
YouTube JavaScript, and no cookies exist on the page until the learner presses play.**

Three things fall out of that:

- A lesson page ships a few KB of JS instead of the ~1 MB a YouTube embed pulls in.
- A learner who only reads the text spends none of their data allowance on video.
- With no third-party cookie set on load, **the site needs no LGPD consent banner.**

Two tests guard this and should not be deleted: a unit test pins the embed hostname to
`www.youtube-nocookie.com`, and an E2E test asserts no `/embed/` request is made before
the click.

### Two type layers for content

`src/lib/content.ts` exposes a minimal structural type (`{ id, data }`) so unit tests
can build fixtures by hand with no build step. Astro pages type their props as
`CollectionEntry<'lessons'>` because `render()` needs the richer shape. `CollectionEntry`
structurally satisfies the narrow type, so the helpers accept both — but using the
narrow type _in a page_ will fail `astro check`.

### Progress never leaves the device

`parseProgress` never throws, whatever it is handed — corrupt JSON, a bare number,
non-string lesson IDs all degrade to valid empty state. With no server-side backup, a
stored blob that crashed the lesson page would be unrecoverable for that learner.

Storage access is wrapped in `try/catch` at every point, including _reading_
`globalThis.localStorage`, which itself throws in blocked-storage contexts. If storage
is unavailable the UI says so honestly instead of pretending to save.

### Migrating to self-hosted video later

If YouTube's branding or recommendations become a problem, the seam is already there.
`videoSourceSchema` is a discriminated union with an unused `hls` arm:

```yaml
video:
  provider: 'hls'
  src: 'https://videos.seudominio.com.br/aula-01/master.m3u8'
  poster: 'https://videos.seudominio.com.br/aula-01/poster.jpg'
```

To make it work you would: transcode locally with ffmpeg, upload the HLS segments to
**Cloudflare R2** (zero egress fees — you pay only ~R$0,05/month for storage at this
library size), serve them from a custom domain, and add an `hls` branch to
`VideoPlayer.astro` using `hls.js`. `embedUrlFor` and `posterUrlFor` already handle the
`hls` case and are tested.

Check Cloudflare's current terms before committing to this — R2 with a custom domain is
the documented path for serving media, but policy is theirs to change, not a technical
guarantee.

---

## Testing

```bash
npm test           # 128 unit tests
npm run test:e2e   # 60 E2E tests across desktop + mobile viewports
```

**Unit** (Vitest) covers the pure logic: content schemas and validation, ordering and
navigation helpers, integrity checks, video URL construction, and progress state
including every corruption and storage-failure path.

**E2E** (Playwright) runs against the **real static build**, not the dev server, so what
CI verifies is byte-for-byte what Cloudflare serves. It covers the full learner journey,
the video facade's privacy guarantees, progress persistence across reloads, the
certificate gate, search, and offline behaviour with the network cut.

**Accessibility** is asserted with `@axe-core/playwright` on all seven page types plus
the unlocked certificate — zero serious or critical violations, WCAG 2.2 AA tags.
A JS budget test fails the build if a page ships more than 100 KB of JavaScript before
interaction.

> Axe catches roughly a third of WCAG issues. It is a regression net, not a substitute
> for judgement — focus order, meaningful alt text, and whether the Portuguese actually
> reads clearly to a shop owner still need a human.

CI (`.github/workflows/ci.yml`) runs the full gate on every push and PR.

---

## What V1 deliberately does not do

No accounts, no payments, no comments or forum, no admin CMS, no i18n, no email capture.
Each of those adds either a server bill or a compliance obligation, and none of them is
needed to teach someone how to set up Google Meu Negócio.

If a community space is wanted later, a WhatsApp or Telegram group costs nothing and
suits this audience far better than a forum nobody visits.

---

## Licence

Dual licensed, because the code and the content are not the same kind of asset.

The code — everything outside `src/content/` — is **AGPL-3.0-only**. The course content in
`src/content/` is **CC BY-NC-SA 4.0**. Full texts are in [`LICENSE`](./LICENSE) and
[`src/content/LICENSE`](./src/content/LICENSE); [`NOTICE`](./NOTICE) is the plain-English
summary.

The split exists because the code is not the moat and the content is. A static Astro site
is worth reading and reusing; the lessons and worksheets are the part that took the work,
and they are meant to stay free for the shop owners they were written for. AGPL rather than
GPL specifically because nobody _distributes_ a website — they serve it, and AGPL is the one
that treats serving as distribution and closes that loophole.

Practically, if you fork this: build on the code however you like, but if you run your
version publicly you have to publish your source under the AGPL, and you cannot sell the
courses or put them behind a paywall. Want the content for something commercial? Ask —
NonCommercial is a default, not a refusal.
