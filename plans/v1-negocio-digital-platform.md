# Negócio Digital — V1 Free Course Platform

Build a free, zero-marginal-cost video course platform teaching Brazilian small
entrepreneurs (MEIs, small shop owners) practical digital skills. Static Astro site,
YouTube-backed video behind a pluggable provider seam, client-side progress, deployed
on Cloudflare Pages. Target running cost: **~R$40/year (domain only)**.

## For Future Agents

As work proceeds: mark checkboxes `- [x]` as items complete; when a phase is done,
set its status to `Complete` and write its **Phase Summary** (what was done, key
decisions, anything needed to continue with zero context); run the phase's
**Verification Plan** and record the result before moving on. When all phases are
done, fill in **Final Recap** and **Deployment Plan**.

Commit at the end of each phase with message `feat(phaseN): <summary>`.

## Locked Decisions (do not revisit without asking the user)

- **Audience/locale:** Brazilian small entrepreneurs. All learner-facing copy in **pt-BR**.
  Code, comments, commits, and README in **English**.
- **Brand:** "Negócio Digital". Repo/folder stays `EMarketingLearner`. Brand centralized
  in `src/config/site.ts` so renaming is one edit.
- **Stack:** Astro 5 (static `output: 'static'`), TypeScript strict, Tailwind CSS v4,
  MDX content collections with Zod validation.
- **Video:** pluggable provider abstraction; YouTube (`youtube-nocookie.com`) is the only
  implementation in V1. Rendered as a **lazy facade** (poster + play button, iframe injected
  on click) — no third-party JS or cookies until the learner opts in, and far less mobile data.
- **Progress:** `localStorage` only. No accounts, no backend, no database, no cookies.
  This is a deliberate cost AND LGPD decision — no personal data leaves the device.
- **Certificate:** print-stylesheet based (`window.print()` → Save as PDF). Zero JS
  dependency, chosen over jsPDF (~350 KB) because the audience is on mobile data.
- **Search:** Pagefind, static index built at compile time. No server.
- **Offline:** PWA service worker caches lesson text + worksheets. Video is excluded.
- **Testing:** Vitest (unit) + Playwright (E2E) + `@axe-core/playwright` (WCAG 2.2 AA).
- **Deploy:** Cloudflare Pages (unlimited free static bandwidth). CI on GitHub Actions.
  The user connects their own accounts; no credentials are handled by the agent.
- **Out of scope for V1:** auth, payments, comments/forum, admin CMS, i18n, self-hosted
  HLS/R2 video, email capture.

## Cost Model (the point of the whole design)

| Line item                                   | Monthly                 |
| ------------------------------------------- | ----------------------- |
| Cloudflare Pages (static hosting/bandwidth) | R$0 — unlimited         |
| YouTube video storage + delivery            | R$0 — unlimited         |
| Pagefind search                             | R$0 — static, no server |
| Progress storage                            | R$0 — learner's device  |
| GitHub Actions CI                           | R$0 — free tier         |
| Domain (`.com.br`, registro.br)             | ~R$3,30 (R$40/year)     |
| **Marginal cost per additional learner**    | **R$0**                 |

---

## Phase 1: Foundation & Tooling

Status: Complete

- [x] Scaffold Astro 5 project at repo root (`output: 'static'`), TypeScript `strict`
- [x] Add Tailwind CSS v4 via `@tailwindcss/vite`, with design tokens for the brand palette
- [x] Add `@astrojs/mdx` and `@astrojs/sitemap`
- [x] Configure ESLint (flat config, `typescript-eslint`, `eslint-plugin-astro`) + Prettier
      with `prettier-plugin-astro`
- [x] Add Vitest using `getViteConfig` from `astro/config` for unit tests
- [x] Add Playwright with `@axe-core/playwright`; config builds and previews the static site
- [x] Create `src/config/site.ts` holding brand name, tagline, URL, locale, social links
- [x] Add `.gitignore`, `.editorconfig`, `.nvmrc` (Node 24)
- [x] Add npm scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `format`, `check`

### Verification Plan

- `npm run check` exits 0 (astro check: 0 errors)
- `npm run lint` exits 0
- `npm run build` exits 0 and produces `dist/index.html`
- `npm run test` exits 0

**Result (verified):** `check` → 0 errors, 0 warnings, 1 hint. `lint` → clean.
`test` → 4/4 passing. `build` → `dist/index.html` emitted, Pagefind indexed 1 page.

### Phase Summary

Astro 5.18 + TypeScript strict + Tailwind v4 scaffold is up and all four gates pass.

Key decisions and gotchas for whoever picks this up:

- **Vite version pinned via `overrides`.** `npm ls vite` originally showed two majors:
  Astro 5.18 depends on `vite@6`, while `@tailwindcss/vite` and `vitest` hoisted `vite@7`.
  That produced a `ts(2322) PluginOption` error in `astro.config.ts`. Fixed properly with
  `"overrides": { "vite": "^6.4.3" }` in `package.json` so there is exactly one Vite in the
  tree — deliberately NOT fixed by casting the plugin type. If you upgrade Astro, re-check
  which Vite major it wants and move this override with it.
- `vitest.config.ts` needs `/// <reference types="vitest/config" />` or `astro check` flags
  the `test` key, because `getViteConfig` returns a plain Vite `UserConfig`.
- **No webfonts anywhere, by design** — system font stack only. Zero bandwidth cost and
  native rendering on the Android devices most learners use.
- `src/styles/global.css` holds the design tokens with **measured WCAG contrast ratios in a
  comment**. Re-verify the ratio if you change a colour.
- `.prose` typography is hand-written (~40 lines) instead of adding
  `@tailwindcss/typography` — one less dependency and full control over contrast.
- `npm run verify` chains format:check → lint → check → test → build as the single local gate.

---

## Phase 2: Content Model & Seed Curriculum

Status: Complete

- [x] Define `src/content.config.ts` with Zod schemas:
  - `courses`: `title`, `description`, `level` (enum), `order`, `published`
  - `lessons`: `title`, `course`, `order`, `video` (discriminated union on
    `provider`), `durationSeconds`, `summary`, `worksheet` (optional), `published`
- [x] Enforce YouTube ID format (`^[A-Za-z0-9_-]{11}$`) in the schema so a bad ID fails the build
- [x] Write course `colocando-seu-negocio-no-digital` with **6 lessons in pt-BR**:
  1. Google Meu Negócio: apareça quando buscarem por você
  2. WhatsApp Business: catálogo, respostas rápidas e etiquetas
  3. Instagram que vende: perfil, bio e destaques que convertem
  4. Pix e pagamentos: receba sem taxa e organize o caixa
  5. Fotos e vídeos com o celular: o básico que muda tudo
  6. Conteúdo que atrai cliente: o que postar quando falta ideia
- [x] Each lesson: real practical pt-BR body copy (not lorem), placeholder YouTube ID,
      and a printable worksheet the learner can forward on WhatsApp
- [x] Add `src/lib/content.ts` helpers: `getPublishedCourses`, `getLessonsForCourse` (sorted),
      `getAdjacentLessons`, `getCourseDuration`
- [x] Unit tests for the content helpers and for schema rejection of malformed entries

### Verification Plan

- `npm run test` passes; includes a test asserting an invalid YouTube ID is rejected
- `npm run build` succeeds and `dist/` contains one HTML file per lesson (expect 6)
- Published lesson count === 6

**Result (verified):** `npm run test` → 66/66 passing across 3 files (site-config 4,
content 38, schemas 24), including six rejection cases for malformed YouTube IDs.
`npx astro sync` → clean, zero warnings: all 13 content files satisfy the Zod schemas.
Frontmatter cross-check: lesson `order` values are 1-6 with no duplicates, six distinct
valid 11-char video IDs, and all six `worksheet` refs match their worksheet `lesson`
back-references. The "one HTML file per lesson" check is deferred to Phase 3, which is
where the routes are created.

### Phase Summary

Content model and the full seed curriculum are in place: 1 course, 6 lessons
(~750 words of real pt-BR each, no placeholder prose), 6 printable worksheets.

Architecture notes for whoever continues:

- **Schemas live in `src/lib/schemas.ts`, not in `content.config.ts`.** They import
  `astro/zod` rather than `astro:content`, which is what makes them unit-testable with no
  build step. `content.config.ts` is a thin wiring file that only attaches glob loaders.
- **`course` is a plain string, not Astro's `reference()`.** `reference()` would have
  forced the schema to import `astro:content` and lose testability. The relational checks
  it would have given us live in `assertContentIntegrity()` instead, which additionally
  catches things `reference()` cannot: duplicate `order` within a course, a lesson filed in
  a directory that disagrees with its `course` field, and orphaned worksheets. It collects
  **all** problems and throws once, so a single build surfaces every error.
- **`src/lib/content-loader.ts` is the only file that imports `astro:content`.** Pages must
  call `loadContent()` rather than `getCollection()` directly, otherwise the integrity
  checks never run.
- **Stale-cache gotcha:** running `astro sync` while content files are still being written
  caches partial entries and then reports bogus `Duplicate id` warnings on the next sync.
  Fix is `rm -rf .astro node_modules/.astro && npx astro sync`. Worth knowing when adding
  a batch of new lessons.
- Placeholder video IDs are `AULA0000001`-`AULA0000006`. They are format-valid so the build
  passes, and obviously fake so they cannot be mistaken for real footage. Swapping in real
  IDs is a frontmatter-only change — see README.

---

## Phase 3: Core UI & Pluggable Video

Status: Complete

- [x] `BaseLayout.astro`: `<html lang="pt-BR">`, skip-link, semantic landmarks, meta/OG tags
- [x] Home page: hero, course catalog, "continue de onde parou" slot
- [x] Course page `/curso/[slug]`: lesson list with per-lesson completion state + progress bar
- [x] Lesson page `/curso/[curso]/[aula]`: video, body, worksheet link, prev/next, mark-complete
- [x] `src/lib/video/embed.ts`: `VideoSource` dispatch (`youtube` today, seam for `hls`)
- [x] `VideoPlayer.astro` implementing the click-to-load facade with
      `youtube-nocookie.com`, poster from `i.ytimg.com`, keyboard-operable play button
      with an accessible name
- [x] Mobile-first responsive layout; no layout shift on video load (aspect-ratio box)
- [x] Unit test: provider dispatch returns the right embed URL and never emits a
      `youtube.com` (cookie-setting) origin
- [x] Bonus: printable worksheet route `/ficha/[ficha]` with a print stylesheet

### Verification Plan

- `npm run test` passes, including the no-cookie-origin assertion
- `npm run build` emits the course route and 6 lesson routes
- `grep -r "www.youtube.com" dist/` returns no matches (only `youtube-nocookie.com` allowed)

**Result (verified):** `npm run test` → 82/82 passing (16 new video-embed tests).
`npm run check` → 0 errors, 0 warnings. `npm run lint` → clean. `npm run build` → 14 pages
(home + 1 course + 6 lessons + 6 worksheets). Cookie-origin grep over `dist/` → **no
matches for `www.youtube.com`**; `youtube-nocookie` present on lesson pages. Lesson HTML
confirmed to contain the rendered MDX body (938 words of visible text on lesson 1).

### Phase Summary

All learner-facing routes render. The site is fully usable end to end, minus the
progress/search/offline features that Phase 4 adds.

Key decisions:

- **The video facade is the centrepiece.** Nothing from YouTube loads until the learner
  presses play — no iframe, no ~1 MB player bundle, no cookies. Three payoffs: fast on weak
  mobile connections, zero data spent by learners who only read the text, and **no LGPD
  consent banner needed** because no third-party cookie is set on load. A unit test asserts
  the hostname is `www.youtube-nocookie.com` and a `dist/` grep proves no cookie-setting
  origin ships. Treat both as regression guards, not decoration.
- **The poster is a CSS `background-image` over a brand gradient, not an `<img>`.** A
  thumbnail that 404s — as every `AULA…` placeholder does — degrades to something
  deliberate-looking rather than a broken-image icon. No JS error handling needed.
- **Focus is moved into the iframe after the swap**, because the button the keyboard user
  activated no longer exists and focus would otherwise reset to the document top.
- **Two type layers, on purpose.** `@/lib/content` exposes a minimal structural
  `Entry<T>` (`{id, data}`) so unit tests can build fixtures by hand. Astro pages instead
  type props as `CollectionEntry<'lessons'>` because `render()` needs `collection` and
  `rendered`. `CollectionEntry` structurally satisfies `Entry<T>`, so helpers accept both.
  Using the narrow type in a page is the one thing that breaks — that was the only
  `astro check` failure in this phase.
- **Pagefind's "Indexed N words" is vocabulary size, not total words.** 1067 for ~6000
  words of Portuguese is correct; it is not evidence of missing content.
- Progress UI is present in the markup but inert: elements carry `data-*` hooks and start
  `hidden`, so the no-JS experience is coherent and Phase 4 only has to wire behaviour.

---

## Phase 4: Progress, Certificate, Search, Offline

Status: Complete

- [x] `src/lib/progress.ts`: pure, serializable state — `toggleLesson`, `isComplete`,
      `courseProgress`, `lastWatched`, versioned schema with a migration path
- [x] `src/lib/progress-store.ts`: localStorage wrapper, `try/catch` on every read AND write
      (private browsing and blocked-storage contexts throw), graceful no-op fallback
- [x] Wire progress into course/lesson pages + "continue de onde parou" on home
- [x] Certificate route `/certificado/[curso]`: gated on course completion, name from a
      local input, print stylesheet (A4 landscape), zero JS deps
- [x] Integrate Pagefind: index built post-`astro build`, search page + keyboard-accessible UI
- [x] Add PWA service worker: runtime caching, excludes YouTube origins,
      offline fallback page in pt-BR
- [x] Unit tests for progress logic incl. corrupted-JSON and throwing-storage cases
- [x] Bonus: `npm run icons` generates the PWA PNG icons from SVG via sharp

### Verification Plan

- `npm run test` passes; progress suite covers toggle, completion %, corrupt payload,
  storage-throws, and version migration
- `npm run build` produces the Pagefind bundle and a service worker in `dist/`
- Playwright E2E: complete all 6 lessons → certificate route becomes reachable

**Result (verified):** `npm run test` → 128/128 across 6 files (46 new: 35 progress,
11 progress-store), covering corrupt JSON, non-object payloads, throwing storage,
de-duplication and version migration. `npm run build` → 17 pages, `dist/pagefind/pagefind.js`,
`dist/sw.js`, `dist/manifest.webmanifest` and three PNG icons all emitted; Pagefind indexed
7 pages. E2E confirms the certificate unlocks only after all six lessons.

### Phase Summary

Progress, certificate, search and offline all work, and the site still costs nothing to run.

Key decisions:

- **`parseProgress` never throws, whatever it is handed.** Corrupt JSON, a JSON array, a
  bare number, non-string lesson ids, a malformed last-watched record — all degrade to
  valid state. With no server-side backup, a stored blob that crashes the lesson page would
  be unrecoverable for that learner; losing a few checkmarks is the far better failure.
- **Storage access is wrapped, not just get/set.** Reading `globalThis.localStorage` itself
  throws in blocked-storage contexts, so `getBrowserStorage()` probes with a real write and
  returns `null` on failure. The UI then reports honestly ("Não foi possível salvar…")
  instead of silently pretending to save.
- **`isCourseComplete` takes the lesson total as an argument** rather than reading a
  catalog. Removing a lesson therefore cannot strand someone at 5/6 forever.
- **Certificate uses `window.print()`, no PDF library.** jsPDF would add ~350 KB to a page
  served to people on mobile data, to replicate what the browser already does.
- **Offline caching is runtime-only, plus a `cache-page` message.** Precaching all six
  lessons would spend data the learner never agreed to spend. But the first visit installs
  a worker that did not intercept that navigation, so the page explicitly asks to be cached
  once the worker is active — otherwise the lesson you are reading right now would vanish
  on reload after losing signal. The worker never touches cross-origin requests, so video
  is entirely outside its control.
- **Pagefind typing gotcha:** `/pagefind/pagefind.js` does not exist at type-check time and
  an ambient `declare module` cannot fix it — TypeScript only accepts those for bare module
  names, not absolute paths. Solution is `src/types/pagefind.ts`: an exported interface plus
  a `PAGEFIND_BUNDLE_URL` constant, imported through a variable specifier so neither tsc nor
  Vite tries to resolve it early.
- Only lesson and course pages carry `data-pagefind-body`, so search returns 7 clean results
  rather than duplicating each lesson with its worksheet.

---

## Phase 5: Accessibility, Performance & E2E

Status: Complete

- [x] WCAG 2.2 AA pass: contrast ≥ 4.5:1, visible focus, logical heading order,
      keyboard-operable controls, `prefers-reduced-motion`, form labels, `aria-live` on
      progress updates
- [x] Playwright E2E journeys: browse catalog → open lesson → play video (facade swaps to
      iframe) → mark complete → progress persists across reload → search finds a lesson
- [x] `@axe-core/playwright` assertions with zero serious/critical violations on
      home, course, lesson, worksheet, search, certificate and offline pages
- [x] Performance budget check: no page ships > 100 KB of JS before video interaction
- [x] Verify offline behaviour in Playwright (`context.setOffline(true)` → lesson text renders)

### Verification Plan

- `npm run test:e2e` exits 0 with all journeys green
- axe assertions report 0 serious/critical violations across all page types
- JS budget assertion passes in the E2E suite

**Result (verified):** `npx playwright test` → **60/60 passing** across two projects
(desktop-chromium and mobile-chromium / Pixel 7). Zero serious or critical axe violations on
all seven page types plus the unlocked certificate. JS budget assertion passes.

### Phase Summary

Two real bugs were found by these tests and fixed — which is the point of writing them:

1. **13 critical axe violations on every worksheet.** GitHub-flavoured Markdown renders
   `- [ ]` as a disabled `<input type="checkbox">` with no label. Fixed at build time with
   `src/lib/rehype-worksheet-checkboxes.ts`, which rewrites those inputs into decorative
   spans that CSS draws as empty squares. This is also strictly better for the worksheet's
   actual purpose: a browser renders a disabled checkbox greyed out, which reads as "you
   cannot use this" on a sheet meant to be filled in with a pen.
2. **Offline did not work on first visit.** The service worker installs during a navigation
   it did not intercept, so that page had no cached copy — reload after losing signal
   showed the offline fallback instead of the lesson. Fixed with the `cache-page` message
   described in Phase 4.

Notes for future work:

- Axe catches roughly a third of WCAG issues. It is a regression net, not a substitute for
  judgement — focus order, meaningful alt text and whether the Portuguese actually reads
  clearly to a small shop owner still need a human.
- The JS budget test (< 100 KB before interaction) is the guard on the whole cost/perf
  thesis. If it fails, something heavy was added; weigh it against learners' mobile data
  before raising the limit.
- E2E runs against the **real static build**, not the dev server, so what CI verifies is
  byte-for-byte what Cloudflare Pages serves.

---

## Phase 6: Docs, CI & Deploy Readiness

Status: Not started

- [ ] `README.md` (English): what it is, cost model table, prerequisites, install, run,
      test, build, **how to add a course/lesson**, **how to swap in real YouTube IDs**,
      how to deploy to Cloudflare Pages, and the migration path to self-hosted R2 video
- [ ] `CONTENT.md`: authoring guide for lessons and worksheets
- [ ] `.github/workflows/ci.yml`: install → lint → check → unit → build → E2E, on push/PR
- [ ] `public/_headers` for Cloudflare: security headers + long-lived asset caching
- [ ] `public/robots.txt`, sitemap, favicon/PWA icons
- [ ] Final full-suite run and cost-model sanity check documented in the README

### Verification Plan

- `npm run lint && npm run check && npm run test && npm run build && npm run test:e2e`
  all exit 0 from a clean install
- `README.md` quickstart verified by following it literally
- CI workflow YAML parses

### Phase Summary

_(write when phase completes)_

---

## Final Recap

_(write when all phases complete)_

## Deployment Plan

_(write when all phases complete)_
