# Trait

[![last commit](https://img.shields.io/github/last-commit/HagiCode-org/trait)](https://github.com/HagiCode-org/trait/commits/main)
[![website](https://img.shields.io/website?url=https%3A%2F%2Ftrait.hagicode.com&label=website)](https://trait.hagicode.com)

Trait is a searchable catalog of agent definitions gathered from tracked open-source collections and from first-party HagiCode traits. Find a suitable agent quickly, then read its definition in full.

**Visit Trait: https://trait.hagicode.com**

## What you can do

- Search the catalog and narrow it down with filters on the catalog page.
- Open a quick-view overlay to peek at an agent without leaving the catalog.
- Read a detail page for each agent, and a separate detail page for each language variant.
- Use the interface in ten languages: `en`, `zh-CN`, `zh-Hant`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `pt-BR`, and `ru-RU`.
- Reuse trait templates that HagiCode Hero can use.

## Where the catalog comes from

The catalog tracks these open-source collections:

- `affaan-m/everything-claude-code`
- `0xfurai/claude-code-subagents`
- `VoltAgent/awesome-claude-code-subagents`
- `iannuttall/claude-agents`
- `gsd-build/get-shit-done`

It also includes the first-party `taciturn` trait from HagiCode, a prompt-level constraint that asks the agent not to call interactive question tools or ask in plain text.

## Route model

- `/` - marketing-style landing page with SSR catalog preview
- `/agents/` - canonical catalog route with React-enhanced filtering and quick-view overlay
- `/agents/[agentId]/` - canonical default-language detail page
- `/agents/[agentId]/[language]/` - canonical language-specific detail page for non-default variants

Legacy root-level query links such as `/?agent=architect&variant=zh-CN` are redirected to `/agents/` and restored there.
