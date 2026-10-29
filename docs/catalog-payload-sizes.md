# Catalog payload sizes

Sizes are measured on `dist/` after `pnpm run build:esa`. "Raw" is the file size in bytes. "Gzip" is `zlib.gzipSync` at Node's default level, the same method `scripts/check-size-budgets.mjs` uses. The budget ceilings use KB = 1024 bytes.

## Before (baseline, task 1.1)

Build: `pnpm run build:esa` on the unchanged tree, 552 pages, `seo:check` passed. The sync step rewrote star counts and timestamps in the tracked `src/data/generated/agent-catalog.json` (metadata only, no item content). The dist was built from that synced copy; the tracked file was then restored with `git checkout`.

| File | Raw (bytes) | Gzip (bytes) |
|---|---:|---:|
| `dist/index.html` (home) | 7,962,047 | 1,842,680 |
| `dist/agents/index.html` (listing) | 7,347,633 | 1,470,843 |
| `dist/agents/01-core-development-api-designer/index.html` (detail) | 62,505 | 15,855 |
| `dist/_astro/route-projection.DLs47h4q.js` | 6,009,666 | 1,396,997 |

Every route pays for the whole catalog: the home and listing HTML embed it as island props, and the route-projection chunk, which the detail page also loads, carries the snapshot.

Baseline tests (task 1.2): `pnpm test` passed on the unchanged tree, 17 files and 92 tests, exit 0.

## After

Build: `pnpm run build:esa` on this change, 552 pages, `seo:check` passed, `size:check` passed (all budgets within ceilings).

| File | Raw (bytes) | Gzip (bytes) | Change in gzip |
|---|---:|---:|---:|
| `dist/index.html` (home) | 250,530 | 40,692 | −97.8% |
| `dist/agents/index.html` (listing) | 1,339,154 | 113,962 | −92.3% |
| `dist/agents/a11y-architect/index.html` (first detail route) | 61,190 | 16,327 | +3.0% (see "Detail pages") |
| `dist/_astro/route-projection.CmAn7BJZ.js` | 52,734 | 17,239 | −98.8% |

JavaScript requested per route (`size:check`, gzip): home 102,197 bytes across 12 files; listing 152,072 bytes across 13 files; detail 148,570 bytes across 13 files.

Ceilings (`scripts/check-size-budgets.mjs`): no ceiling was changed, because the measured build is within every ceiling (task 7.5). Home HTML 40,692 ≤ 350 KB; listing HTML 113,962 ≤ 450 KB; detail HTML 16,327 ≤ 100 KB; per-route JavaScript ≤ 300 KB; route-projection chunk 17,239 ≤ 50 KB.

## Search shards (task 5.7)

One shard per content language that has variants. Each shard holds `title summary bodyPlainText` lower-cased per entry. Shard sizes are reported separately and do not count toward any route budget.

| Shard | Raw (bytes) | Gzip (bytes) |
|---|---:|---:|
| `data/search/en.f7d71c64e5.json` | 1,680,987 | 484,049 |
| `data/search/ja-JP.bd3d46fe97.json` | 322,091 | 79,251 |
| `data/search/zh-CN.f65b7d7e28.json` | 138,959 | 56,110 |
| `data/search/tr.5ef7e91ea1.json` | 117,190 | 38,013 |
| `data/search/zh-TW.a871f1541f.json` | 35,035 | 14,925 |
| `data/search/ko-KR.f9bd8bf0f5.json` | 41,876 | 15,439 |
| `data/search/pt-BR.a8df2ae115.json` | 34,770 | 11,541 |
| Total | 2,370,908 | 699,328 |

Sharding decision: one shard per content language, with a content hash in each URL, so the URLs can be cached as immutable. `en` is the largest shard at 484 KB gzip. The design's next step (D5) is to split `en` by agent-id range. That split is not applied: it is needed only if `en` proves too large for the first search, and the first search is already progressive (metadata matches appear at once, and `en` loads first). Revisit this figure after real use.

## Detail pages (tasks 6.1 and 6.2)

6.1, measured with `bodyPlainText` removed from props but every language variant still present: the first detail route `a11y-architect` measured 20,717 bytes gzip in an intermediate build. The baseline page was 15,855 bytes gzip. That intermediate build also differed in other ways, so this comparison does not isolate the effect of removing `bodyPlainText`; the cause of the increase was not determined. The figure is recorded as measured.

6.2 trigger: per-entry JSON for non-active variants cuts detail HTML gzip by more than 30% on 16 of the 379 detail pages. All 16 have several variants (four or seven). The cut ranges from 31% to 55%. The first detail route is not among them (19.6% at the time), but the rule applies to the detail HTML generally, so the fallback is implemented for every detail page.

Decision implemented: the detail page's payload carries only its own language's variant. Switching to another language loads `dist/data/agents/<agentId>.json` with a labelled loading state, and copy original is disabled until the variant has loaded. The active variant's article is still pre-rendered in the HTML, so the page stays crawlable.

Measured effect on the 16 pages (gzip, bytes, before → after):

| Entry | Variants | Before | After |
|---|---:|---:|---:|
| architect | 7 | 33,135 | 16,542 |
| build-error-resolver | 7 | 30,899 | 15,231 |
| chief-of-staff | 4 | 26,409 | 16,066 |
| code-reviewer | 7 | 40,974 | 20,323 |
| database-reviewer | 7 | 34,387 | 15,361 |
| doc-updater | 7 | 29,524 | 14,766 |
| e2e-runner | 7 | 32,697 | 15,167 |
| flutter-reviewer | 4 | 41,363 | 20,842 |
| go-build-resolver | 7 | 27,531 | 14,842 |
| go-reviewer | 7 | 26,455 | 14,523 |
| planner | 7 | 31,433 | 16,280 |
| python-reviewer | 4 | 24,464 | 14,850 |
| refactor-cleaner | 7 | 27,278 | 14,252 |
| security-reviewer | 7 | 34,836 | 15,495 |
| tdd-guide | 7 | 26,814 | 14,579 |
| typescript-reviewer | 4 | 30,784 | 17,203 |

Detail pages (for example `a11y-architect`) with fewer than 30% savings also changed, because the fallback applies uniformly. The largest detail page now is `gsd-planner` at 47,075 bytes gzip (single variant, unchanged), well under the 100 KB ceiling.

## Fonts and delivery (tasks 8.1 to 8.4)

- Subset evaluation (8.1): every locale's UI strings and the catalog's card text use `latin` (all locales) and `latin-ext` (four Turkish characters in the catalog), and `cyrillic` (the Russian UI). `greek`, `greek-ext`, `vietnamese` and `cyrillic-ext` are not used. CJK, kana and hangul fall outside Inter and render with the system font stack.
- Subset change (8.2): not applied. `@fontsource-variable/inter` exposes only `index.css`, `standard.css`, `wght.css` and `opsz.css`, each declaring all subsets. Narrowing would mean hand-written `@font-face` rules. The unused faces are already gated by unicode-range and never download, and the CSS saving is under 1 KB gzip of the 13.9 KB built shared CSS.
- `font-display` (8.3): the package already sets `font-display: swap` on every face. A headless check of first paint on `/`, `/agents/` and a detail page requests `inter-latin-wght-normal` and `inter-cyrillic-wght-normal` on each route. No preload is added: the hashed font URLs are not available to the layout without a build-time lookup, and the swap policy already avoids invisible text.
- ESA `notFoundStrategy` (8.4): kept at `singlePageApplication`. ESA documents that the setting applies only to navigation requests. Neither documented value changes the response for a missing `/_astro/*` script request, so no change can meet the spec's requirement. The limitation is recorded in `docs/esa-delivery.md`.
- Delivery checklist (8.5): `docs/esa-delivery.md`.

## Browser checks (task 9.3)

Headless Chromium against the built `dist` on `127.0.0.1`, with every other host blocked:

- Initial load of `/`, `/agents/` and `/agents/a11y-architect/` makes zero `/data/search/*` requests.
- Typing a query fetches all seven shards once; a second query adds no request.
- The drawer deep link `?agent=typescript-reviewer&variant=en` reaches `ready` and renders the article.
- Copy original copies the active variant with its frontmatter.
- The listing switches UI locale (`html lang` updates) and filters by content language (379 → 60 results for `ja-JP`).
- The homepage switches UI locale and shows 24 featured cards.
- The detail page's non-page language loads the entry JSON, updates the path to `/agents/a11y-architect/ja-JP/`, renders the article, and enables copy original.

Console: the only page errors are `LA is not defined` (analytics blocked offline) and React error #418 (a hydration text or HTML mismatch) on the drawer deep link and on the homepage. Those are noted as an open item below.

## Open items

- React #418 (hydration mismatch) on the drawer deep link (`/agents/?agent=…&variant=…`). The baseline build (HEAD, built in scratch) throws the same #418 on the same URL, so this predates the change. The drawer state is read from `window.location.search` after server rendering. Not fixed here.
- React #418 also appeared on the homepage in one browser session, after a stored UI locale (set on the listing page) differed from the server-rendered `en`. In a clean browser context the homepage has no #418 on either build. The stored-locale read is unchanged code. Not fixed here.
- Language-filtered search matches only that language's text (one shard). Unfiltered search covers all languages, as before. This is the spec's single-shard requirement; the earlier behaviour matched text in every language even under a language filter.
