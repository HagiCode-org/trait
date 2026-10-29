// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { HomePageShell } from "@/components/home/HomePageShell"
import { uiLocales, type FeaturedCard, type SourceMeta, type UiLocale } from "@/data/ui-constants"
import { buildAgentLanguagePath } from "@/lib/route-projection"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

const featuredZhCard: FeaturedCard = {
  agentId: "architect",
  defaultLanguage: "en",
  availableLanguages: ["en", "zh-CN"],
  language: "zh-CN",
  sourceLabel: "everything-claude-code",
  type: "architect",
  title: "架构师",
  summary: "中文架构专家。",
}

const featuredEnCard: FeaturedCard = {
  agentId: "planner",
  defaultLanguage: "en",
  availableLanguages: ["en"],
  language: "en",
  sourceLabel: "everything-claude-code",
  type: "planner",
  title: "Planner",
  summary: "English planning specialist.",
}

const featuredByLocale = Object.fromEntries(
  uiLocales.map((locale: UiLocale) => [locale, locale === "zh-CN" ? [featuredZhCard] : [featuredEnCard]])
) as Record<UiLocale, FeaturedCard[]>

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
        <HomePageShell featuredByLocale={featuredByLocale} sources={sources} metrics={metrics} initialLocale="zh-CN" />
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

    const featuredCardLink = getRequiredAnchor(`a.catalog-card[href="${buildAgentLanguagePath(featuredZhCard, "zh-CN")}"]`)
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
