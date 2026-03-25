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
    expect(agentCatalogSnapshot.items.length).toBeGreaterThanOrEqual(20)
    expect(Object.keys(agentCatalogSnapshot.languageIndex)).toContain("ja-JP")
  })

  it("derives filter options from snapshot data instead of fixed frontend enums", () => {
    const filterOptions = buildFilterOptions(agentCatalogSnapshot)

    expect(filterOptions.sources.find((option) => option.value === "everything-claude-code")?.count).toBe(agentCatalogSnapshot.items.length)
    expect(filterOptions.languages.find((option) => option.value === "ja-JP")?.count).toBeGreaterThan(0)
    expect(filterOptions.types.find((option) => option.value === "planner")?.count).toBeGreaterThan(0)
  })

  it("supports combined keyword, source, language, and dynamic type filters", () => {
    const result = queryCatalog({
      query: "plan",
      sourceId: "everything-claude-code",
      contentLanguage: "ja-JP",
      agentType: "planner",
    })

    expect(result.map((item) => item.agentId)).toContain("planner")
    expect(result.every((item) => item.type === "planner")).toBe(true)
    expect(result.every((item) => item.sourceId === "everything-claude-code")).toBe(true)
    expect(result.every((item) => item.availableLanguages.includes("ja-JP"))).toBe(true)
  })

  it("falls back to the default language when the requested variant is missing", () => {
    const snapshot = structuredClone(agentCatalogSnapshot)
    const item = snapshot.items.find((entry) => entry.agentId === "planner")

    expect(item).toBeDefined()
    if (!item) {
      return
    }

    delete item.variants["ja-JP"]
    item.availableLanguages = item.availableLanguages.filter((language) => language !== "ja-JP")

    const detail = resolveAgentDetail("planner", "ja-JP", snapshot)

    expect(detail).not.toBeNull()
    expect(detail?.activeLanguage).toBe(item.defaultLanguage)
    expect(detail?.fallbackLanguage).toBe(item.defaultLanguage)
  })

  it("restores deep-link route state for newly synchronized agents", () => {
    const routeState = readRouteStateFromSearch(
      "?q=architect&source=everything-claude-code&content=zh-CN&type=architect&agent=architect&variant=zh-CN"
    )

    expect(routeState.filters.query).toBe("architect")
    expect(routeState.filters.sourceId).toBe("everything-claude-code")
    expect(routeState.filters.contentLanguage).toBe("zh-CN")
    expect(routeState.filters.agentType).toBe("architect")
    expect(routeState.detail.agentId).toBe("architect")
    expect(routeState.detail.language).toBe("zh-CN")
    expect(writeRouteStateToSearch(routeState)).toContain("agent=architect")
  })
})
