import { describe, expect, it } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import {
  buildAgentAlternatePaths,
  buildAgentLanguagePath,
  buildFilterOptions,
  deriveDetailUiLocale,
  pickDetailLanguage,
  projectDetailLanguageToUiLocale,
  queryCatalog,
  readRouteStateFromSearch,
  resolveAgentDetail,
  writeRouteStateToSearch,
} from "@/lib/route-projection"

describe("route-projection", () => {
  it("derives filter options from snapshot data instead of fixed frontend enums", () => {
    const filterOptions = buildFilterOptions(agentCatalogSnapshot)
    const everythingCount = agentCatalogSnapshot.items.filter((item) => item.sourceId === "everything-claude-code").length

    expect(filterOptions.sources.find((option) => option.value === "everything-claude-code")?.count).toBe(everythingCount)
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

  it("falls back to a valid language when the requested variant is missing", () => {
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
    expect(pickDetailLanguage(item, "ja-JP")).toBe(item.defaultLanguage)
  })

  it("projects supported detail languages into UI locales with a predictable fallback", () => {
    expect(projectDetailLanguageToUiLocale("zh-CN")).toBe("zh-CN")
    expect(projectDetailLanguageToUiLocale("en")).toBe("en")
    expect(projectDetailLanguageToUiLocale("ja-JP")).toBe("ja-JP")
    expect(deriveDetailUiLocale("ja-JP")).toBe("ja-JP")
    expect(deriveDetailUiLocale("ko-KR", "zh-CN")).toBe("ko-KR")
  })

  it("restores deep-link state and writes it back to query params", () => {
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

  it("projects canonical and alternate detail routes for each language", () => {
    const item = agentCatalogSnapshot.items.find((entry) => entry.agentId === "architect")

    expect(item).toBeDefined()
    if (!item) {
      return
    }

    const alternates = buildAgentAlternatePaths(item)

    expect(buildAgentLanguagePath(item, item.defaultLanguage)).toBe(`/agents/${item.agentId}/`)
    expect(alternates[item.defaultLanguage]).toBe(`/agents/${item.agentId}/`)
    expect(alternates["zh-CN"]).toBe(`/agents/${item.agentId}/zh-CN/`)
  })
})
