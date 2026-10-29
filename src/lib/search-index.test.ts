import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import type { AgentCatalogItem, FilterState, SearchShardDescriptor } from "@/data/ui-constants"
import { buildCatalogMeta, buildListItems, buildSearchShards } from "@/lib/catalog-loader"
import {
  FIRST_SEARCH_LANGUAGE,
  buildSearchStatus,
  clearSearchShardCache,
  loadSearchShard,
  mergeShardText,
  selectShardsForSearch,
} from "@/lib/search-index"
import { queryCatalog } from "@/lib/route-projection"

const shardDescriptors: SearchShardDescriptor[] = [
  { language: "ja-JP", url: "/data/search/ja-JP.aaaaaaaaaa.json", entryCount: 5 },
  { language: FIRST_SEARCH_LANGUAGE, url: `/data/search/${FIRST_SEARCH_LANGUAGE}.bbbbbbbbbb.json`, entryCount: 9 },
  { language: "zh-CN", url: "/data/search/zh-CN.cccccccccc.json", entryCount: 7 },
  { language: "tr", url: "/data/search/tr.dddddddddd.json", entryCount: 2 },
]

describe("search shard selection", () => {
  it("requests only the filtered language's shard when a content filter is set", () => {
    expect(selectShardsForSearch(shardDescriptors, "zh-CN").map((shard) => shard.language)).toEqual(["zh-CN"])
  })

  it("requests every shard with en first, then the largest, when no content filter is set", () => {
    expect(selectShardsForSearch(shardDescriptors, "all").map((shard) => shard.language)).toEqual([FIRST_SEARCH_LANGUAGE, "zh-CN", "ja-JP", "tr"])
  })

  it("requests no shard for an unknown language filter", () => {
    expect(selectShardsForSearch(shardDescriptors, "fr-FR")).toEqual([])
  })
})

describe("search status model", () => {
  it("is idle with nothing to load, loading while shards are pending, incomplete after a failure, complete when all load", () => {
    expect(buildSearchStatus({ total: 0, loaded: 0, failed: 0 })).toEqual({ state: "idle" })
    expect(buildSearchStatus({ total: 4, loaded: 1, failed: 0 })).toEqual({ state: "loading", loaded: 1, total: 4 })
    expect(buildSearchStatus({ total: 4, loaded: 2, failed: 1 })).toEqual({ state: "loading", loaded: 2, total: 4 })
    expect(buildSearchStatus({ total: 4, loaded: 3, failed: 1 })).toEqual({ state: "incomplete", loaded: 3, total: 4 })
    expect(buildSearchStatus({ total: 4, loaded: 4, failed: 0 })).toEqual({ state: "complete", loaded: 4, total: 4 })
  })

  it("merges loaded shard text per agent", () => {
    const merged = mergeShardText([{ "agent-a": "alpha" }, { "agent-a": "beta", "agent-b": "gamma" }])

    expect(merged.get("agent-a")).toBe("alpha beta")
    expect(merged.get("agent-b")).toBe("gamma")
  })
})

describe("shard loading", () => {
  beforeEach(() => {
    clearSearchShardCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fetches each shard once per page session", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ entries: { a: "x" } }), { status: 200 }))

    await loadSearchShard(shardDescriptors[1], fetchMock as unknown as typeof fetch)
    await loadSearchShard(shardDescriptors[1], fetchMock as unknown as typeof fetch)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("evicts a failed shard so that a retry requests it again", async () => {
    let attempts = 0
    const fetchMock = vi.fn(async () => {
      attempts += 1
      return attempts <= 2
        ? new Response("nope", { status: 500 })
        : new Response(JSON.stringify({ entries: { a: "x" } }), { status: 200 })
    })

    await expect(loadSearchShard(shardDescriptors[1], fetchMock as unknown as typeof fetch)).rejects.toThrow()
    await expect(loadSearchShard(shardDescriptors[1], fetchMock as unknown as typeof fetch)).resolves.toEqual({ a: "x" })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe("search coverage against the previous single-index implementation", () => {
  it("returns the same result counts for a sample of single-word queries on the same catalog", () => {
    const snapshot = agentCatalogSnapshot
    const items = buildListItems(snapshot)
    const fullText = mergeShardText(
      buildSearchShards(snapshot).map((shard) => (JSON.parse(shard.json) as { entries: Record<string, string> }).entries)
    )
    const meta = buildCatalogMeta(snapshot)
    expect(meta.totalAgents).toBe(items.length)

    const sampleQueries = ["reviewer", "architect", "planner", "security", "typescript", "build", "kotlin", "gradle", "agent", "plan"]
    for (const query of sampleQueries) {
      const filters: FilterState = { query, sourceId: "all", contentLanguage: "all", agentType: "all" }
      const previous = legacyQueryCount(filters, snapshot.items)
      const current = queryCatalog(filters, items, fullText).length

      expect(current, query).toBe(previous)
    }
  })
})

/** The single-index matcher before the split: metadata plus every variant's title, summary and plain text. Reference only. */
function legacyQueryCount(filters: FilterState, items: AgentCatalogItem[]) {
  const normalizedQuery = filters.query.trim().toLowerCase()

  return items.filter((item) => {
    if (!normalizedQuery) {
      return true
    }

    const index = [
      item.agentId,
      item.sourceAgentId,
      item.name,
      item.summary,
      item.type,
      item.sourceLabel,
      item.sourceRepo,
      item.model ?? "",
      item.canonicalPath,
      ...item.tags,
      ...item.tools,
      ...item.availableLanguages,
      ...item.availableLanguages.flatMap((language) => {
        const variant = item.variants[language]
        return variant ? [variant.title, variant.summary, variant.bodyPlainText] : []
      }),
    ]
      .join(" ")
      .toLowerCase()

    return index.includes(normalizedQuery)
  }).length
}
