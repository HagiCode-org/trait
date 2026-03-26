// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import { CatalogPageShell } from "@/components/agents/CatalogPageShell"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

describe("CatalogPageShell", () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    window.localStorage.clear()
    window.localStorage.setItem("trait-ui-locale", "zh-CN")
    window.history.replaceState(null, "", "/agents/")
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
    window.history.replaceState(null, "", "/agents/")
    window.localStorage.clear()
  })

  it("restores a contextual deep link from legacy query params", async () => {
    window.history.replaceState(null, "", "/agents/?q=reviewer&agent=typescript-reviewer&variant=en")
    await renderShell()

    expect(getPanel("desktop").textContent).toContain("typescript-reviewer")
    expect(window.location.search).toContain("q=reviewer")
  })

  it("opens a quick view from the catalog without leaving /agents/", async () => {
    await renderShell()

    expect(container.textContent).toContain("可靠 Agent Gallery")
    expect(container.textContent).toContain("按来源、语言和类型快速筛选可靠 Agent")

    const quickViewButton = getRequiredElement('[data-agent-card-id="typescript-reviewer"] button') as HTMLButtonElement
    act(() => {
      quickViewButton.click()
    })

    expect(window.location.pathname).toBe("/agents/")
    expect(window.location.search).toContain("agent=typescript-reviewer")
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).not.toBeNull()
  })

  it("switches detail language while preserving the browse query", async () => {
    window.history.replaceState(null, "", "/agents/?q=reviewer&agent=typescript-reviewer&variant=en")
    await renderShell()

    const trButton = getRequiredElement('[data-testid="desktop-detail-panel"] [data-detail-language="tr"]') as HTMLAnchorElement
    act(() => {
      trButton.click()
    })

    expect(window.location.search).toContain("q=reviewer")
    expect(window.location.search).toContain("variant=tr")
  })

  it("keeps the quick-view overlay open when switching UI locale", async () => {
    window.history.replaceState(null, "", "/agents/?agent=typescript-reviewer&variant=en")
    await renderShell()

    const localeButton = getRequiredElement('[data-locale-switch="en"]') as HTMLButtonElement
    act(() => {
      localeButton.click()
    })

    expect(getPanel("desktop").textContent).toContain("Close detail")
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).not.toBeNull()
  })

  it("hides singleton type filters and caps the type filter height", async () => {
    await renderShell()

    const typeCounts = new Map<string, number>()
    for (const item of agentCatalogSnapshot.items) {
      typeCounts.set(item.type, (typeCounts.get(item.type) ?? 0) + 1)
    }

    const singletonType = [...typeCounts.entries()].find(([, count]) => count < 2)?.[0]
    const visibleType = [...typeCounts.entries()].find(([, count]) => count >= 2)?.[0]

    expect(singletonType).toBeDefined()
    expect(visibleType).toBeDefined()

    const typeGroup = getRequiredElement('[data-testid="filter-group-type"]')
    const typeOptions = getRequiredElement('[data-testid="filter-options-type"]')

    expect(typeOptions.className).toContain("max-h-44")
    expect(typeOptions.className).toContain("overflow-y-auto")
    expect(typeGroup.querySelector(`[data-filter-option="${singletonType}"]`)).toBeNull()
    expect(typeGroup.querySelector(`[data-filter-option="${visibleType}"]`)).not.toBeNull()
  })
})

async function renderShell() {
  await act(async () => {
    root.render(<CatalogPageShell snapshot={agentCatalogSnapshot} initialLocale="zh-CN" />)
    await Promise.resolve()
  })
}

function getPanel(mode: "desktop" | "mobile") {
  return getRequiredElement(`[data-testid="${mode}-detail-panel"]`)
}

function getRequiredElement(selector: string) {
  const element = container.querySelector(selector)

  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }

  return element
}
