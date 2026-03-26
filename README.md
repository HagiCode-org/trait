# Trait

Trait is the Astro-powered frontend workspace for `trait.hagicode.com`, focused on a searchable agent catalog with crawlable canonical detail pages and client-side browsing enhancements.

## What changed

- The production entry now uses Astro static routes instead of a single Vite SPA shell.
- Home, catalog, and canonical detail pages render their primary content directly into HTML.
- Search, filters, UI locale switching, and contextual quick-view overlays still run as React islands.
- SEO metadata, JSON-LD, `robots.txt`, and `sitemap.xml` are generated from the catalog snapshot during build.

## Catalog sync workflow

The catalog snapshot lives at `src/data/generated/agent-catalog.json`.

Tracked sources are declared in `scripts/agent-sources.mjs`. The canonical source for `everything-claude-code` lives in the local submodule at `vendor/everything-claude-code`.

Refresh the submodule source first:

```bash
npm run sync:agents:update-source
```

Then regenerate the catalog snapshot:

```bash
npm run sync:agents
```

The sync script:

- scans canonical `agents/*.md` files from each configured source;
- pairs multilingual variants by canonical file name;
- parses frontmatter and body content;
- merges multilingual variants into one canonical agent record;
- writes source metadata, language coverage, and sync timestamps into the generated snapshot.

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

## Route model

- `/` - marketing-style landing page with SSR catalog preview
- `/agents/` - canonical catalog route with React-enhanced filtering and quick-view overlay
- `/agents/[agentId]/` - canonical default-language detail page
- `/agents/[agentId]/[language]/` - canonical language-specific detail page for non-default variants

Legacy root-level query links such as `/?agent=architect&variant=zh-CN` are redirected to `/agents/` and restored there.
