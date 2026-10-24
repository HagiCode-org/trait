---
public: true
multilingual: false
style: product
---

# README requirements

## Product focus

- Present Trait (https://trait.hagicode.com) as a searchable catalog of agent definitions gathered from tracked open-source collections and from first-party HagiCode traits, with a canonical detail page for each agent and language variant.
- Main features users get: search and filters on the catalog page, a quick-view overlay, detail pages per agent and per language, a ten-language interface, and trait templates that HagiCode Hero can use.
- Address people looking for agent definitions to read, compare and reuse; they are users, not developers of this site.
- Lead with product value (find a suitable agent quickly and read it in full), then the pages a visitor can open.

## Required content

- Open with a short introduction and a prominent link to https://trait.hagicode.com.
- Describe the catalog features, the pages a visitor can open (home, catalog, agent detail and language-specific detail) and the supported interface languages, as the current README does.
- Say where catalog content comes from at the level of the tracked source collections and the first-party `taciturn` trait; do not explain how syncing works.
- Source and route descriptions must match `src/`, `first-party/` and the submodule configuration.

## Exclusions

- Exclude tokens, secret values, internal hosts, machine-specific paths and private links.
- Keep repository maintenance instructions out of the README: repository layout, internal architecture, the catalog sync workflow, adding sources, writing first-party traits, CI, build internals, deployment and contribution workflow.
