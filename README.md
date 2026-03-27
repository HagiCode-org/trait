# Trait

Trait is the Astro-powered frontend workspace for `trait.hagicode.com`, focused on a searchable agent catalog with crawlable canonical detail pages and client-side browsing enhancements.

## What changed

- The production entry now uses Astro static routes instead of a single Vite SPA shell.
- Home, catalog, and canonical detail pages render their primary content directly into HTML.
- Search, filters, UI locale switching, and contextual quick-view overlays still run as React islands.
- SEO metadata, JSON-LD, `robots.txt`, and `sitemap.xml` are generated from the catalog snapshot during build.

## Catalog sync workflow

The catalog snapshot lives at `src/data/generated/agent-catalog.json`.

Tracked sources are declared in `scripts/agent-sources.mjs` as a multi-source registry. Each entry declares stable metadata such as:

- `cliFamily`
- `sourceKind`
- `layoutType`
- `fileFormat`
- `pathPatterns`
- `directCompatible`
- `needsRecursiveScan`
- `needsCustomParser`
- `enabled`

The current registry supports two markdown source kinds:

- `agent_markdown_flat` for fixed layouts such as `agents/*.md` or repository-root `*.md`
- `agent_markdown_recursive` for categorized layouts such as `categories/**/*.md` or `marketing/**/*.md`

Vendor sources live under `vendor/` as git submodules. The current registry tracks:

- `affaan-m/everything-claude-code`
- `0xfurai/claude-code-subagents`
- `VoltAgent/awesome-claude-code-subagents`
- `iannuttall/claude-agents`
- `gsd-build/get-shit-done`

`gsd-build/get-shit-done` is currently synced as a single-language English source. Trait only scans `agents/*.md` from that vendor checkout and does not ingest its `commands/`, `hooks/`, or `skills/` directories.

Refresh the submodule source first:

```bash
npm run sync:agents:update-source
```

Then regenerate the catalog snapshot:

```bash
npm run sync:agents
```

Recommended maintenance flow:

```bash
npm run sync:agents:update-source
npm run sync:agents
npm run test
npm run build
```

The sync script:

- dispatches canonical discovery by `layoutType` and `pathPatterns`;
- supports both flat markdown and recursive markdown sources;
- pairs multilingual variants by canonical file path and configured variant roots;
- parses frontmatter and body content;
- merges multilingual variants into one canonical agent record;
- scopes colliding cross-source slugs into stable source-qualified route ids;
- records source-scoped warnings and only hard fails when every enabled source fails;
- enriches each source summary with GitHub stargazer counts;
- writes source metadata, coverage metrics, language coverage, and sync timestamps into the generated snapshot.

## Adding a new source

1. Add the upstream repository as a `vendor/` submodule.
2. Declare a new registry entry in `scripts/agent-sources.mjs`.
3. Set `sourceKind`, `layoutType`, `pathPatterns`, canonical base path, and any variant directories.
4. Add exclude patterns when the upstream repository mixes in README or tooling markdown files.
5. Run `npm run test`, `npm run sync:agents`, and `npm run build`.

## Development

```bash
npm install
npm run sync:agents:update-source
npm run dev
```

`npm run dev` regenerates the catalog snapshot first, then starts the Astro dev server.

## Build and verification

```bash
npm run test
npm run build
npm run seo:check
```

`npm run build` runs the full local quality gate in one pass:

1. regenerate `agent-catalog.json`;
2. run `astro check`;
3. build the static Astro site;
4. verify the built HTML, metadata, JSON-LD, robots, and sitemap output.

## Hero Agent Template Export

- Hero Trait 模板的 canonical 输出位于 `src/data/generated/agent-templates/`。
- 生成命令是 `npm run sync:agent-templates`，脚本入口是 `scripts/generate-agent-templates.mjs`。
- 输出内容固定包含 `index.json` 与 `templates/*.json`，并带有 `tags`、`tagGroups.languages`、`tagGroups.domains`、`tagGroups.roles`。
- `repos/index` 会镜像这些 JSON 到 `/agent-templates/trait/**`，因此不要把 `repos/index` 当作 Trait 模板主编辑位置。

## Route model

- `/` - marketing-style landing page with SSR catalog preview
- `/agents/` - canonical catalog route with React-enhanced filtering and quick-view overlay
- `/agents/[agentId]/` - canonical default-language detail page
- `/agents/[agentId]/[language]/` - canonical language-specific detail page for non-default variants

Legacy root-level query links such as `/?agent=architect&variant=zh-CN` are redirected to `/agents/` and restored there.
