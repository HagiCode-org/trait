import { describe, expect, it } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import {
  buildFilterOptions,
  queryCatalog,
  readRouteStateFromSearch,
  resolveAgentDetail,
  writeRouteStateToSearch,
} from "@/lib/trait-builder"

describe("agent catalog selectors", () => {
  it("reads sync snapshot metadata", () => {
    expect(agentCatalogSnapshot.lastSyncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(Array.isArray(agentCatalogSnapshot.items)).toBe(true)
    expect(agentCatalogSnapshot.items.length).toBeGreaterThanOrEqual(6)
  })

  it("supports combined keyword, source, language, and type filters", () => {
    const result = queryCatalog({
      query: "typescript",
      sourceId: "everything-claude-code",
      contentLanguage: "zh-CN",
      agentType: "reviewer",
    })

    expect(result.map((item) => item.agentId)).toContain("typescript-reviewer")
    expect(result.every((item) => item.type === "reviewer")).toBe(true)
    expect(result.every((item) => item.sourceId === "everything-claude-code")).toBe(true)
    expect(result.every((item) => item.availableLanguages.includes("zh-CN"))).toBe(true)
  })

  it("falls back to the default language when the requested variant is missing", () => {
    const snapshot = structuredClone(agentCatalogSnapshot)
    const item = snapshot.items.find((entry) => entry.agentId === "kotlin-build-resolver")

    expect(item).toBeDefined()
    if (!item) {
      return
    }

    delete item.variants["zh-CN"]
    item.availableLanguages = item.availableLanguages.filter((language) => language !== "zh-CN")

    const detail = resolveAgentDetail("kotlin-build-resolver", "zh-CN", snapshot)

    expect(detail).not.toBeNull()
    expect(detail?.activeLanguage).toBe("en")
    expect(detail?.fallbackLanguage).toBe("en")
  })

  it("restores deep-link route state from URL parameters", () => {
    const routeState = readRouteStateFromSearch("?q=java&source=everything-claude-code&content=tr&type=reviewer&agent=java-reviewer&variant=tr")

    expect(routeState.filters.query).toBe("java")
    expect(routeState.filters.sourceId).toBe("everything-claude-code")
    expect(routeState.filters.contentLanguage).toBe("tr")
    expect(routeState.filters.agentType).toBe("reviewer")
    expect(routeState.detail.agentId).toBe("java-reviewer")
    expect(routeState.detail.language).toBe("tr")
    expect(writeRouteStateToSearch(routeState)).toContain("agent=java-reviewer")
  })

  it("tracks source metadata and available filter counts", () => {
    const filterOptions = buildFilterOptions(agentCatalogSnapshot)
    const sourceOption = filterOptions.sources.find((option) => option.value === "everything-claude-code")

    expect(sourceOption?.count).toBe(agentCatalogSnapshot.items.length)
    expect(filterOptions.languages.find((option) => option.value === "en")?.count).toBeGreaterThan(0)
  })
})
