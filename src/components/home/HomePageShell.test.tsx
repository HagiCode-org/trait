// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/use-analytics", () => ({
  useAnalyticsBootstrap: () => {},
}))

import { HomePageShell } from "@/components/home/HomePageShell"
import { agentCatalogSnapshot } from "@/data/trait-catalog"
import { buildAgentPath, buildCatalogSummary } from "@/lib/route-projection"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const featuredItems = agentCatalogSnapshot.items.slice(0, 4)
const metrics = buildCatalogSummary(agentCatalogSnapshot)

describe("HomePageShell", () => {
  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it("highlights the gallery section and makes featured cards directly clickable", async () => {
    await act(async () => {
      root.render(
        <HomePageShell featuredItems={featuredItems} sources={agentCatalogSnapshot.sources} metrics={metrics} initialLocale="zh-CN" />
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

    const firstCardLink = getRequiredAnchor(`a.catalog-card[href="${buildAgentPath(featuredItems[0].agentId)}"]`)
    expect(firstCardLink.textContent).toContain(featuredItems[0].name)
    expect(container.textContent).not.toContain("打开页面")
    expect(container.textContent).toContain("高效 Agent 必备特质")
  })
})

function getRequiredAnchor(selector: string) {
  const element = container.querySelector(selector)

  if (!(element instanceof HTMLAnchorElement)) {
    throw new Error(`Anchor not found: ${selector}`)
  }

  return element
}
