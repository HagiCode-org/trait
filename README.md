# Trait

Trait is the frontend workspace for `trait.hagicode.com`, now positioned as an agent aggregation surface instead of the previous trait blueprint builder.

## What it does now

- Aggregates tracked agent definitions from vendored git submodules into a static local catalog snapshot.
- Lets users search and filter by keyword, source, content language, and agent type.
- Keeps source traceability visible through repository metadata, sync warnings, and deep-linkable detail views.
- Separates UI locale from content language so a Chinese interface can still browse English or Turkish agent content.

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

- Reads tracked Markdown files from the local submodule checkout.
- Parses frontmatter and body content.
- Merges multilingual variants into one canonical agent record.
- Writes `lastSyncedAt`, `warnings`, source metadata, and language availability into the generated snapshot.

## Internationalization boundary

Trait now models two different language concerns:

- `src/i18n/` controls UI locale strings for the interface itself.
- Catalog metadata controls content language filtering for agent variants such as `en`, `zh-CN`, and `tr`.

These two layers are intentionally separate.

## Development

```bash
npm install
npm run sync:agents:update-source
npm run dev
```

`npm run build` now performs the local pipeline in one pass: read submodule content, regenerate `agent-catalog.json`, then bundle the frontend.

## Quality checks

```bash
npm run lint
npm run test
npm run build
```
