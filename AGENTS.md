# Trait - Agent Configuration

## Root Configuration

Inherits all behavior from `/AGENTS.md` at the monorepo root. Local rules extend or override the root file for this repository.

## Project Context

This repository is the Astro-powered frontend for [trait.hagicode.com](https://trait.hagicode.com), providing a searchable agent catalog with crawlable canonical detail pages. The catalog snapshot lives at `src/data/generated/agent-catalog.json`.

## Working Directory

Run commands from `repos/trait/`.

## Key Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm test
pnpm run sync:agents
pnpm run sync:agent-templates
pnpm run seo:check
pnpm run i18n:check
pnpm run lint
```

`pnpm run build` runs `prepare:i18n`, `sync:agents`, `astro check`, `astro build` and `seo:check`; the ESA host uses `pnpm run build:esa` (`esa.jsonc`), which syncs with `--allow-stale-output`. `pnpm test` runs vitest over `src/**/*.test.ts(x)` and `scripts/**/*.test.mjs`.

## Key Paths

- `src/pages/`: Astro routes (home, catalog, detail pages)
- `src/components/`: React islands for search, filters, overlays
- `src/data/generated/agent-catalog.json`: catalog snapshot; `src/data/generated/agent-templates/`: generated Hero trait templates
- `vendor/`: upstream trait sources as git submodules (see `.gitmodules`)
- `scripts/`: agent sync, SEO validation
- `first-party/agents/`: first-party trait markdown, read by the local `hagicode-first-party` source

## Agent Guidelines

- Primary content renders as static HTML via Astro; use React islands only for interactivity.
- SEO metadata, JSON-LD, `robots.txt`, and `sitemap.xml` are generated during build from the catalog snapshot.
- Run `pnpm run sync:agents` to refresh the catalog from tracked sources before building.
- Run `pnpm run seo:check` after build to validate SEO metadata.
- After editing `first-party/agents/*.md` (frontmatter `name` and single-line `description` required), run both `pnpm run sync:agents` and `pnpm run sync:agent-templates` and commit the generated outputs with the source; `sync:agents:update-source` only advances vendor submodules. Keywords in first-party text can alter inferred type/tags (see `inferTags` in `scripts/sync-agents.mjs`).
- Keep `@hagicode/hagilight` and `@hagicode/hagilight-core` pinned to the same exact version. Analytics come from Hagilight (`BaseLayout.astro` renders the core GA/51LA components, the `hagilight()` integration injects PostHog); do not add site-owned analytics wrappers.
- Do not hand-edit generated files; edit i18n YAML sources and run `pnpm run i18n:generate`. Deploys via `.github/workflows/trait-deploy-gh-pages.yml` (Node 24, recursive submodules).

## PostHog Site Events

The site sends three site-level PostHog events through `src/lib/posthog-events.ts` (`captureSiteEvent`). The table `SITE_POSTHOG_EVENTS` in that module is the only allowlist; `src/lib/posthog-events.test.ts` checks it.

| Event | Sent when | Properties |
|-------|-----------|------------|
| `agent_link_copied` | The agent detail link copy succeeds (`AgentDetailPageShell`) | `agent_id` (string, public agent identifier) |
| `agent_markdown_copied` | The agent original Markdown copy succeeds (`AgentDetailPageShell`) | `agent_id` (string, public agent identifier) |
| `catalog_searched` | The aggregator catalog's settled query or filter state changes (`AgentAggregatorShell`, 400 ms settle, first render is a baseline and sends nothing) | `results_count` (non-negative integer) |

Rules:

- Properties never carry copied text, URLs, search terms, filter values or agent content. Super-properties (`site_id`, `site_framework`, `hagilight_version`, `locale`, `page_type`) are never sent.
- A rejected clipboard write sends nothing. Events fire only after the copy or settled state is committed.
- Deduplication with `cta_click`: a click on an anchor with `data-ga-*` may produce both the business event and `cta_click`. The business event above is canonical; dashboards must not add it to `cta_click` counts.
- With PostHog missing, opted out, or throwing, copy and search behave as before and nothing is sent.

## References

- `README.md`
- `scripts/agent-sources.mjs`
- `docs/i18n-hagi18n.md`
- `DESIGN.md` (design-system reference for UI changes)

## Package management

- The repository uses pnpm, pinned in `package.json` `packageManager`. Run `corepack enable` once, then `pnpm install`. `pnpm-lock.yaml` is the only lockfile; do not commit `package-lock.json`.
- Settings live in `pnpm-workspace.yaml`. `allowBuilds` lists the dependencies whose install scripts may run (reviewed individually, `false` means reviewed and denied); review any new dependency that has an install script and add it there.
- A local registry mirror belongs in `~/.npmrc` only. Never commit a `registry=` line or a mirror URL; `pnpm run check:registry` (also run in CI) fails on any non-`registry.npmjs.org` `tarball` in the lockfile and on mirror hosts in tracked files.
- Undeclared imports fail under pnpm's strict layout: declare the package instead of hoisting it.
