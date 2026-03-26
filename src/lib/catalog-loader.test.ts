import { describe, expect, it } from "vitest"

import { getAvailableLanguages, getCatalogStats, loadCatalogItems, loadCatalogSnapshot, loadCatalogSources } from "@/lib/catalog-loader"

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
})
