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

Status: Not started

- [ ] Define `src/content.config.ts` with Zod schemas:
  - `courses`: `title`, `slug`, `description`, `level` (enum), `order`, `published`
  - `lessons`: `title`, `course` (reference), `order`, `video` (discriminated union on
    `provider`), `durationSeconds`, `summary`, `worksheet` (optional), `published`
- [ ] Enforce YouTube ID format (`^[A-Za-z0-9_-]{11}$`) in the schema so a bad ID fails the build
- [ ] Write course `colocando-seu-negocio-no-digital` with **6 lessons in pt-BR**:
  1. Google Meu Negócio: apareça quando buscarem por você
  2. WhatsApp Business: catálogo, respostas rápidas e etiquetas
  3. Instagram que vende: perfil, bio e destaques que convertem
  4. Pix e pagamentos: receba sem taxa e organize o caixa
  5. Fotos e vídeos com o celular: o básico que muda tudo
  6. Conteúdo que atrai cliente: o que postar quando falta ideia
- [ ] Each lesson: real practical pt-BR body copy (not lorem), placeholder YouTube ID,
      and a printable worksheet the learner can forward on WhatsApp
- [ ] Add `src/lib/content.ts` helpers: `getPublishedCourses`, `getLessonsForCourse` (sorted),
      `getAdjacentLessons`, `getCourseDuration`
- [ ] Unit tests for the content helpers and for schema rejection of malformed entries

### Verification Plan

- `npm run test` passes; includes a test asserting an invalid YouTube ID is rejected
- `npm run build` succeeds and `dist/` contains one HTML file per lesson (expect 6)
- Published lesson count === 6

### Phase Summary

_(write when phase completes)_

---

## Phase 3: Core UI & Pluggable Video

Status: Not started

- [ ] `BaseLayout.astro`: `<html lang="pt-BR">`, skip-link, semantic landmarks, meta/OG tags
- [ ] Home page: hero, course catalog, "continue de onde parou" slot
- [ ] Course page `/curso/[slug]`: lesson list with per-lesson completion state + progress bar
- [ ] Lesson page `/curso/[curso]/[aula]`: video, body, worksheet download, prev/next, mark-complete
- [ ] `src/lib/video/types.ts`: `VideoSource` discriminated union (`youtube` today, seam for `hls`)
- [ ] `VideoPlayer.astro` dispatching on `provider`; `YouTubeFacade.astro` implementing
      click-to-load with `youtube-nocookie.com`, poster from `i.ytimg.com`,
      keyboard-operable play button with an accessible name
- [ ] Mobile-first responsive layout; no layout shift on video load (aspect-ratio box)
- [ ] Unit test: provider dispatch returns the right embed URL and never emits a
      `youtube.com` (cookie-setting) origin

### Verification Plan

- `npm run test` passes, including the no-cookie-origin assertion
- `npm run build` emits the course route and 6 lesson routes
- `grep -r "www.youtube.com" dist/` returns no matches (only `youtube-nocookie.com` allowed)

### Phase Summary

_(write when phase completes)_

---

## Phase 4: Progress, Certificate, Search, Offline

Status: Not started

- [ ] `src/lib/progress.ts`: pure, serializable state — `toggleLesson`, `isComplete`,
      `courseProgress`, `lastWatched`, versioned schema with a migration path
- [ ] `src/lib/progress-store.ts`: localStorage wrapper, `try/catch` on every read AND write
      (private browsing and blocked-storage contexts throw), graceful no-op fallback
- [ ] Wire progress into course/lesson pages + "continue de onde parou" on home
- [ ] Certificate route `/certificado/[curso]`: gated on course completion, name from a
      local input, print stylesheet (A4 landscape), zero JS deps
- [ ] Integrate Pagefind: index built post-`astro build`, search page + keyboard-accessible UI
- [ ] Add PWA service worker: precache HTML/CSS/JS/worksheets, exclude YouTube origins,
      offline fallback page in pt-BR
- [ ] Unit tests for progress logic incl. corrupted-JSON and throwing-storage cases

### Verification Plan

- `npm run test` passes; progress suite covers toggle, completion %, corrupt payload,
  storage-throws, and version migration
- `npm run build` produces the Pagefind bundle and a service worker in `dist/`
- Playwright E2E: complete all 6 lessons → certificate route becomes reachable

### Phase Summary

_(write when phase completes)_

---

## Phase 5: Accessibility, Performance & E2E

Status: Not started

- [ ] WCAG 2.2 AA pass: contrast ≥ 4.5:1, visible focus, logical heading order,
      keyboard-operable controls, `prefers-reduced-motion`, form labels, `aria-live` on
      progress updates
- [ ] Playwright E2E journeys: browse catalog → open lesson → play video (facade swaps to
      iframe) → mark complete → progress persists across reload → search finds a lesson
- [ ] `@axe-core/playwright` assertions with zero serious/critical violations on
      home, course, lesson, search, and certificate pages
- [ ] Performance budget check: no page ships > 100 KB of JS before video interaction
- [ ] Verify offline behaviour in Playwright (`context.setOffline(true)` → lesson text renders)

### Verification Plan

- `npm run test:e2e` exits 0 with all journeys green
- axe assertions report 0 serious/critical violations across all 5 page types
- JS budget assertion passes in the E2E suite

### Phase Summary

_(write when phase completes)_

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
