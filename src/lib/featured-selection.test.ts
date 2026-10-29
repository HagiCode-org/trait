import { describe, expect, it } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import type { AgentCatalogItem, AgentCatalogSnapshot, UiLocale } from "@/data/ui-constants"
import { uiLocales } from "@/data/ui-constants"
import { FEATURED_SELECTION_SIZE, chunkFeaturedItems, selectFeaturedCardsByLocale } from "@/lib/featured-selection"

describe("featured-selection", () => {
  it("selects 24 locale-compatible featured cards at build time", () => {
    const snapshot = createSnapshot({
      items: [
        ...Array.from({ length: 30 }, (_, index) => createAgentItem(index + 1, ["en", "zh-CN"])),
        ...Array.from({ length: 10 }, (_, index) => createAgentItem(index + 101, ["en"])),
      ],
    })

    const selections = selectFeaturedCardsByLocale(snapshot, {
      targetSize: FEATURED_SELECTION_SIZE,
      rng: createDeterministicRng(0.37),
    })

    expect(selections.en).toHaveLength(24)
    expect(selections["zh-CN"]).toHaveLength(24)
    expect(Object.keys(selections).sort()).toEqual([...uiLocales].sort())
    expect(selections["de-DE"]).toHaveLength(24)
    expect(selections["zh-CN"].every((card) => card.availableLanguages.includes("zh-CN"))).toBe(true)
    expect(selections["de-DE"].every((card) => card.availableLanguages.includes("en"))).toBe(true)
  })

  it("chunks selected cards into stable carousel slides", () => {
    const items = Array.from({ length: 24 }, (_, index) => createAgentItem(index + 1, ["en"]))

    const slides = chunkFeaturedItems(items)

    expect(slides).toHaveLength(3)
    expect(slides.every((slide) => slide.length === 8)).toBe(true)
  })

  it("pre-resolved cards match the previous pickFeaturedVariant output for every UI locale with a fixed rng", () => {
    const fixtures = [
      createSnapshot({
        items: [
          ...Array.from({ length: 12 }, (_, index) => createAgentItem(index + 1, ["en", "zh-CN", "zh-Hant", "ja-JP"])),
          ...Array.from({ length: 12 }, (_, index) => createAgentItem(index + 101, ["zh-Hant", "ko-KR"])),
          ...Array.from({ length: 12 }, (_, index) => createAgentItem(index + 201, ["ja-JP"])),
        ],
      }),
      agentCatalogSnapshot,
    ]

    for (const snapshot of fixtures) {
      const cardsByLocale = selectFeaturedCardsByLocale(snapshot, { targetSize: FEATURED_SELECTION_SIZE, rng: createDeterministicRng(0.37) })

      for (const locale of uiLocales) {
        for (const card of cardsByLocale[locale]) {
          const item = snapshot.items.find((entry) => entry.agentId === card.agentId)
          expect(item).toBeDefined()
          if (!item) {
            continue
          }

          const legacy = legacyPickFeaturedVariant(item, locale)
          expect({ title: card.title, summary: card.summary, language: card.language }).toEqual({
            title: legacy.title,
            summary: legacy.summary,
            language: legacy.language,
          })
          expect(card.sourceLabel).toBe(item.sourceLabel)
          expect(card.type).toBe(item.type)
          expect(card.defaultLanguage).toBe(item.defaultLanguage)
          expect(card.availableLanguages).toEqual(item.availableLanguages)
        }
      }
    }
  })
})

/** The variant choice as it was in HomePageShell before pre-resolution. Kept only as the equivalence reference. */
function legacyPickFeaturedVariant(item: AgentCatalogItem, locale: UiLocale) {
  const candidates = locale === "zh-Hant"
    ? ["zh-Hant", "zh-CN", "en"]
    : locale.startsWith("zh")
      ? [locale, "zh-CN", "en"]
      : [locale, "en"]

  for (const language of candidates) {
    const variant = item.variants[language]
    if (variant) {
      return variant
    }
  }

  return item.variants[item.defaultLanguage] ?? item.variants[item.availableLanguages[0]]
}

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
