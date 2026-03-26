import { describe, expect, it } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import { buildAgentDetailMetadata, buildCatalogMetadata, buildHomeMetadata } from "@/lib/metadata-builder"

describe("metadata-builder", () => {
  it("builds homepage metadata with canonical, OG, twitter and JSON-LD", () => {
    const metadata = buildHomeMetadata(agentCatalogSnapshot.items.length)

    expect(metadata.canonical).toBe("https://trait.hagicode.com/")
    expect(metadata.openGraph.url).toBe(metadata.canonical)
    expect(metadata.twitter.card).toBe("summary_large_image")
    expect(metadata.jsonLd[0]["@type"]).toBe("WebSite")
  })

  it("builds catalog metadata for the canonical directory route", () => {
    const metadata = buildCatalogMetadata(agentCatalogSnapshot.items.length)

    expect(metadata.canonical).toBe("https://trait.hagicode.com/agents/")
    expect(metadata.title).toContain("Catalog")
    expect(metadata.jsonLd[0]["@type"]).toBe("CollectionPage")
  })

  it("builds detail metadata with language alternates and structured data", () => {
    const item = agentCatalogSnapshot.items.find((entry) => entry.agentId === "architect")

    expect(item).toBeDefined()
    if (!item) {
      return
    }

    const metadata = buildAgentDetailMetadata(item, "zh-CN")

    expect(metadata.canonical).toBe("https://trait.hagicode.com/agents/architect/zh-CN/")
    expect(metadata.alternates.some((alternate) => alternate.hreflang === "en")).toBe(true)
    expect(metadata.alternates.some((alternate) => alternate.hreflang === "zh-CN")).toBe(true)
    expect(metadata.jsonLd[0]["@type"]).toBe("CreativeWork")
  })
})
