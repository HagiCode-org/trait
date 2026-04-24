// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/use-analytics", () => ({
  useAnalyticsBootstrap: () => {},
}))

import { HomePageShell } from "@/components/home/HomePageShell"
import type { AgentCatalogItem, SourceMeta } from "@/data/trait-catalog"
import { buildAgentLanguagePath } from "@/lib/route-projection"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

const featuredZhItem = createAgentItem({
  agentId: "architect",
  sourceLabel: "everything-claude-code",
  type: "architect",
  defaultLanguage: "en",
  availableLanguages: ["en", "zh-CN"],
  variants: {
    en: createVariant({
      language: "en",
      title: "Architect",
      summary: "English architecture specialist.",
    }),
    "zh-CN": createVariant({
      language: "zh-CN",
      title: "架构师",
      summary: "中文架构专家。",
    }),
  },
})

const featuredEnItem = createAgentItem({
  agentId: "planner",
  sourceLabel: "everything-claude-code",
  type: "planner",
  defaultLanguage: "en",
  availableLanguages: ["en"],
  variants: {
    en: createVariant({
      language: "en",
      title: "Planner",
      summary: "English planning specialist.",
    }),
  },
})

const featuredItemsByLocale = {
  en: [featuredEnItem],
  "zh-CN": [featuredZhItem],
}

const sources: SourceMeta[] = [
  {
    id: "everything-claude-code",
    label: "everything-claude-code",
    repo: "affaan-m/everything-claude-code",
    branch: "main",
    homepageUrl: "https://github.com/affaan-m/everything-claude-code",
    sourceType: "git-submodule",
    cliFamily: "claude",
    sourceKind: "agent_markdown_flat",
    layoutType: "flat",
    fileFormat: "md",
    pathPatterns: ["agents/*.md"],
    directCompatible: true,
    needsRecursiveScan: false,
    needsCustomParser: false,
    trackedAgents: 1,
    syncedAgents: 1,
    languages: ["en", "zh-CN"],
    stargazerCount: 42,
    stargazerCountLastFetchedAt: "2026-03-26T06:39:44.383Z",
    lastSyncedAt: "2026-03-26T06:39:44.383Z",
    available: true,
    warningCount: 0,
    warnings: [],
  },
]

const metrics = {
  totalAgents: 2,
  totalLanguages: 2,
  totalSources: 1,
  totalTypes: 2,
}

describe("HomePageShell", () => {
  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.documentElement.lang = ""
  })

  it("highlights the gallery section and renders locale-specific featured cards", async () => {
    await act(async () => {
      root.render(
        <HomePageShell featuredItemsByLocale={featuredItemsByLocale} sources={sources} metrics={metrics} initialLocale="zh-CN" />
      )
      await Promise.resolve()
    })

    expect(getRequiredAnchor('a[href="https://hagicode.com/"]').textContent).toBe("了解 HagiCode")
    const galleryBanner = getRequiredAnchor('[data-testid="home-gallery-banner"]')
    expect(galleryBanner.getAttribute("href")).toBe("/agents/")
    expect(galleryBanner.textContent).toContain("进入 Gallery")
    expect(galleryBanner.textContent).toContain("高效 Agent 必备特质")
    expect(galleryBanner.textContent).toContain("浏览从互联网上收集的，经过大量验证的可靠 Agent 描述。")
    expect(container.querySelector('[data-testid="home-gallery-grid"]')).not.toBeNull()

    const featuredCardLink = getRequiredAnchor(`a.catalog-card[href="${buildAgentLanguagePath(featuredZhItem, "zh-CN")}"]`)
    expect(featuredCardLink.textContent).toContain("架构师")
    expect(featuredCardLink.textContent).toContain("中文架构专家。")
    expect(container.textContent).toContain("Star 数")
    expect(container.textContent).not.toContain("Planner")
    expect(document.documentElement.lang).toBe("zh-CN")
  })
})

function getRequiredAnchor(selector: string) {
  const element = container.querySelector(selector)

  if (!(element instanceof HTMLAnchorElement)) {
    throw new Error(`Anchor not found: ${selector}`)
  }

  return element
}

function createAgentItem(overrides: Partial<AgentCatalogItem>): AgentCatalogItem {
  return {
    traitCatalogId: overrides.traitCatalogId ?? overrides.agentId ?? "agent",
    agentId: overrides.agentId ?? "agent",
    sourceAgentId: overrides.sourceAgentId ?? overrides.agentId ?? "agent",
    name: overrides.name ?? "Agent",
    summary: overrides.summary ?? "Agent summary.",
    type: overrides.type ?? "agent",
    tags: overrides.tags ?? [],
    tools: overrides.tools ?? [],
    model: overrides.model ?? null,
    sourceId: overrides.sourceId ?? "source",
    sourceLabel: overrides.sourceLabel ?? "source",
    sourceRepo: overrides.sourceRepo ?? "example/source",
    sourceType: overrides.sourceType ?? "git-submodule",
    sourceUrl: overrides.sourceUrl ?? "https://example.com/source",
    canonicalPath: overrides.canonicalPath ?? "agents/agent.md",
    defaultLanguage: overrides.defaultLanguage ?? "en",
    availableLanguages: overrides.availableLanguages ?? ["en"],
    variants: overrides.variants ?? {
      en: createVariant({
        language: "en",
        title: overrides.name ?? "Agent",
        summary: overrides.summary ?? "Agent summary.",
      }),
    },
  }
}

function createVariant({
  language,
  title,
  summary,
}: {
  language: string
  title: string
  summary: string
}) {
  return {
    language,
    title,
    summary,
    body: summary,
    bodyPlainText: summary,
    sourcePath: `${language}.md`,
    sourceUrl: `https://example.com/${language}.md`,
    rawUrl: `https://example.com/${language}.md?raw=1`,
    attributes: {},
  }
}
