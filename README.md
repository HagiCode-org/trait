# Trait

Trait is the frontend workspace for `trait.hagicode.com`, positioned as a searchable agent aggregation workbench rather than the previous trait blueprint builder.

## Homepage layout principles

- Search, filter chips, result count, and the catalog grid own the first viewport.
- Source traceability is shown inside each agent detail instead of a homepage summary surface.
- Detail opens as a contextual surface so users can inspect an agent without losing the current browsing state.
- UI locale and content language remain separate, so a Chinese interface can still open English or Turkish agent content.

## What it does now

- Aggregates tracked agent definitions from vendored git submodules into a static local catalog snapshot.
- Lets users search and filter by keyword, source, content language, and agent type.
- Keeps source traceability visible through repository metadata and deep-linkable detail views.
- Preserves shareable links for the current agent detail state while keeping the catalog browse context recoverable.

## Catalog sync workflow

The catalog snapshot lives at `src/data/generated/agent-catalog.json`.

Tracked sources are declared in `scripts/agent-sources.mjs`. The canonical source for `everything-claude-code` now lives in the local submodule at `vendor/everything-claude-code`.

Refresh the submodule source first:

```bash
npm run sync:agents:update-source
```

Then regenerate the catalog snapshot:

```bash
npm run sync:agents
```

The sync script:

- Scans the canonical `agents/*.md` files from each configured source instead of relying on a fixed agent whitelist.
- Uses the configured language directories in `scripts/agent-sources.mjs` to pair multilingual variants by canonical file name.
- Parses frontmatter and body content.
- Merges multilingual variants into one canonical agent record.
- Derives tracked coverage, synced counts, language coverage, and filterable agent types from the discovered catalog snapshot.
- Writes `lastSyncedAt`, source metadata, and language availability into the generated snapshot.

## Internationalization boundary

Trait models two separate language concerns:

- `src/i18n/` controls UI locale strings for the interface itself.
- Catalog metadata controls content language filtering for agent variants such as `en`, `zh-CN`, and `tr`.

These two layers are intentionally separate.

## Development

```bash
npm install
npm run sync:agents:update-source
npm run dev
```

`npm run build` performs the local pipeline in one pass: read submodule content, regenerate `agent-catalog.json`, then bundle the frontend.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```
