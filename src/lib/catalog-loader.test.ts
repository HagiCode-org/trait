import { describe, expect, it } from "vitest"

import {
  buildCatalogMeta,
  buildDetailPayload,
  buildFeaturedCards,
  buildListItems,
  buildSearchShards,
  getAvailableLanguages,
  getCatalogStats,
  loadCatalogItems,
  loadCatalogSnapshot,
  loadCatalogSources,
} from "@/lib/catalog-loader"
import { uiLocales } from "@/data/ui-constants"

describe("catalog-loader", () => {
  it("loads the generated snapshot as the single content source", () => {
    const snapshot = loadCatalogSnapshot()

    expect(snapshot.lastSyncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(snapshot.items.length).toBeGreaterThanOrEqual(20)
    expect(snapshot.sources.length).toBeGreaterThan(0)
  })

  it("derives high-level stats from the snapshot", () => {
    const stats = getCatalogStats()

    expect(stats.totalAgents).toBe(loadCatalogItems().length)
    expect(stats.totalSources).toBe(loadCatalogSources().length)
    expect(stats.totalLanguages).toBeGreaterThanOrEqual(5)
  })

  it("lists available content languages from the language index", () => {
    expect(getAvailableLanguages()).toContain("ja-JP")
    expect(getAvailableLanguages()).toContain("zh-CN")
  })

  it("builds catalog metadata with the lists and counts the islands validate against", () => {
    const snapshot = loadCatalogSnapshot()
    const meta = buildCatalogMeta(snapshot)

    expect(meta.totalAgents).toBe(snapshot.items.length)
    expect(meta.sources).toEqual(snapshot.sources)
    expect(meta.contentLanguages).toEqual(getAvailableLanguages())
    expect(meta.agentTypes).toEqual([...new Set(snapshot.items.map((item) => item.type))].sort((left, right) => left.localeCompare(right)))
    expect(meta.languageCounts["ja-JP"]).toBe(snapshot.items.filter((item) => item.availableLanguages.includes("ja-JP")).length)
  })

  it("builds list items without variant collections", () => {
    const items = buildListItems()

    expect(items).toHaveLength(loadCatalogSnapshot().items.length)
    expect(items.every((item) => !("variants" in item))).toBe(true)
  })

  it("builds one featured card per UI locale, each with the variant that locale shows", () => {
    const cards = buildFeaturedCards()

    expect(Object.keys(cards).sort()).toEqual([...uiLocales].sort())
    for (const locale of uiLocales) {
      expect(cards[locale].length).toBeGreaterThan(0)
      expect(cards[locale].length).toBeLessThanOrEqual(24)
    }
  })

  it("builds a detail payload with every variant but without bodyPlainText", () => {
    const item = loadCatalogSnapshot().items.find((entry) => entry.agentId === "architect")
    const payload = buildDetailPayload("architect")

    expect(item).toBeDefined()
    expect(payload?.item.agentId).toBe("architect")
    expect(payload?.item.variants[item!.defaultLanguage]?.body).toBe(item!.variants[item!.defaultLanguage].body)
    expect(JSON.stringify(payload)).not.toContain("bodyPlainText")
    expect(payload?.source?.id).toBe(item?.sourceId)
    expect(buildDetailPayload("no-such-agent")).toBeNull()
  })

  it("builds one search shard per content language, hashed into its URL, with lower-cased title, summary and text", () => {
    const snapshot = loadCatalogSnapshot()
    const shards = buildSearchShards(snapshot)
    const languages = shards.map((shard) => shard.language)

    expect(new Set(languages).size).toBe(languages.length)
    for (const shard of shards) {
      expect(shard.url).toMatch(new RegExp(`^/data/search/${shard.language}\\.[0-9a-f]{10}\\.json$`))
      const parsed = JSON.parse(shard.json) as { language: string; entries: Record<string, string> }
      expect(parsed.language).toBe(shard.language)
      expect(Object.keys(parsed.entries)).toHaveLength(shard.entryCount)
    }

    const englishShard = shards.find((shard) => shard.language === "en")
    const architect = snapshot.items.find((entry) => entry.agentId === "architect")
    expect(englishShard).toBeDefined()
    expect(architect).toBeDefined()
    const entries = JSON.parse(englishShard!.json).entries as Record<string, string>
    expect(entries.architect).toBe(
      [architect!.variants.en.title, architect!.variants.en.summary, architect!.variants.en.bodyPlainText].join(" ").toLowerCase()
    )
  })

  it("serializes home and listing props without any body or bodyPlainText", () => {
    const snapshot = loadCatalogSnapshot()
    const homeProps = { featuredByLocale: buildFeaturedCards(snapshot), sources: snapshot.sources }
    const listingProps = { items: buildListItems(snapshot), meta: buildCatalogMeta(snapshot) }

    for (const props of [homeProps, listingProps]) {
      const serialized = JSON.stringify(props)
      expect(serialized).not.toContain('"body"')
      expect(serialized).not.toContain("bodyPlainText")
      expect(serialized).not.toContain('"variants"')
    }
  })
})
