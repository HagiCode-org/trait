// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import App from "@/App"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

describe("App contextual detail routing", () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    window.localStorage.clear()
    window.localStorage.setItem("trait-aggregator-ui-locale", "zh-CN")
    window.history.replaceState(null, "", "/")
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
    window.history.replaceState(null, "", "/")
    window.localStorage.clear()
  })

  it("opens a contextual detail surface from the catalog", () => {
    window.history.replaceState(null, "", "/?q=typescript")
    renderApp()

    const card = getRequiredElement('[data-agent-card-id="typescript-reviewer"]') as HTMLButtonElement

    act(() => {
      card.click()
    })

    expect(window.location.search).toContain("q=typescript")
    expect(window.location.search).toContain("agent=typescript-reviewer")
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).not.toBeNull()
  })

  it("restores a deep link and closes detail without losing filters", () => {
    window.history.replaceState(null, "", "/?q=reviewer&agent=typescript-reviewer&variant=en")
    renderApp()

    expect(getPanel("desktop").textContent).toContain("typescript-reviewer")

    const closeButton = getButtonWithin(getPanel("desktop"), "关闭详情")
    act(() => {
      closeButton.click()
    })

    expect(window.location.search).toContain("q=reviewer")
    expect(window.location.search).not.toContain("agent=")
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).toBeNull()
  })

  it("switches detail language while preserving the browsing query", () => {
    window.history.replaceState(null, "", "/?q=reviewer&agent=typescript-reviewer&variant=en")
    renderApp()

    const trButton = getRequiredElement('[data-testid="desktop-detail-panel"] [data-detail-language="tr"]') as HTMLButtonElement
    act(() => {
      trButton.click()
    })

    expect(window.location.search).toContain("q=reviewer")
    expect(window.location.search).toContain("agent=typescript-reviewer")
    expect(window.location.search).toContain("variant=tr")
  })

  it("keeps the contextual detail open when switching UI locale", () => {
    window.history.replaceState(null, "", "/?q=reviewer&agent=typescript-reviewer&variant=en")
    renderApp()
    const beforeSwitch = window.location.search

    const localeButton = getRequiredElement('[data-locale-switch="en"]') as HTMLButtonElement
    act(() => {
      localeButton.click()
    })

    expect(window.location.search).toBe(beforeSwitch)
    expect(getPanel("desktop").textContent).toContain("Close detail")
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).not.toBeNull()
  })
})

function renderApp() {
  act(() => {
    root.render(<App />)
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

function getButtonWithin(scope: Element, label: string) {
  const button = Array.from(scope.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  )

  if (!button) {
    throw new Error(`Button not found in scope: ${label}`)
  }

  return button as HTMLButtonElement
}
