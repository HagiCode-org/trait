import { describe, expect, it } from "vitest"

import type { AgentCatalogItem, AgentCatalogSnapshot } from "@/data/trait-catalog"
import { FEATURED_SELECTION_SIZE, chunkFeaturedItems, selectFeaturedItemsByLocale } from "@/lib/featured-selection"

describe("featured-selection", () => {
  it("selects 24 locale-compatible featured items at build time", () => {
    const snapshot = createSnapshot({
      items: [
        ...Array.from({ length: 30 }, (_, index) => createAgentItem(index + 1, ["en", "zh-CN"])),
        ...Array.from({ length: 10 }, (_, index) => createAgentItem(index + 101, ["en"])),
      ],
    })

    const selections = selectFeaturedItemsByLocale(snapshot, {
      targetSize: FEATURED_SELECTION_SIZE,
      rng: createDeterministicRng(0.37),
    })

    expect(selections.en).toHaveLength(24)
    expect(selections["zh-CN"]).toHaveLength(24)
    expect(selections["zh-CN"].every((item) => item.availableLanguages.includes("zh-CN"))).toBe(true)
  })

  it("chunks selected items into stable carousel slides", () => {
    const items = Array.from({ length: 24 }, (_, index) => createAgentItem(index + 1, ["en"]))

    const slides = chunkFeaturedItems(items)

    expect(slides).toHaveLength(6)
    expect(slides.every((slide) => slide.length === 4)).toBe(true)
  })
})

function createSnapshot({ items }: { items: AgentCatalogItem[] }): AgentCatalogSnapshot {
  return {
    version: 1,
    lastSyncedAt: "2026-03-26T06:39:44.383Z",
    languageIndex: {
      en: items.map((item) => item.agentId),
      "zh-CN": items.filter((item) => item.availableLanguages.includes("zh-CN")).map((item) => item.agentId),
    },
    sources: [],
    items,
  }
}

function createAgentItem(id: number, availableLanguages: string[]): AgentCatalogItem {
  const agentId = `agent-${id}`
  const variants = Object.fromEntries(
    availableLanguages.map((language) => [
      language,
      {
        language,
        title: `${agentId}-${language}`,
        summary: `${agentId}-${language}-summary`,
        body: `${agentId}-${language}-body`,
        bodyPlainText: `${agentId}-${language}-body`,
        sourcePath: `${agentId}-${language}.md`,
        sourceUrl: `https://example.com/${agentId}/${language}`,
        rawUrl: `https://example.com/${agentId}/${language}?raw=1`,
        attributes: {},
      },
    ])
  )

  return {
    traitCatalogId: agentId,
    agentId,
    sourceAgentId: agentId,
    name: agentId,
    summary: `${agentId}-summary`,
    type: "agent",
    tags: [],
    tools: [],
    model: null,
    sourceId: "source",
    sourceLabel: "source",
    sourceRepo: "example/source",
    sourceType: "git-submodule",
    sourceUrl: "https://example.com/source",
    canonicalPath: `agents/${agentId}.md`,
    defaultLanguage: "en",
    availableLanguages,
    variants,
  }
}

function createDeterministicRng(value: number) {
  return () => value
}
