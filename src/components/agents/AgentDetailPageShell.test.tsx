// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import { AgentDetailPageShell } from "@/components/agents/AgentDetailPageShell"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const item = agentCatalogSnapshot.items.find((entry) => entry.agentId === "architect")!
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

describe("AgentDetailPageShell", () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    window.history.replaceState(null, "", "/agents/architect/")
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
  })

  it("renders the canonical detail heading and markdown body", async () => {
    await renderDetail()

    expect(container.querySelector("h1")?.textContent).toContain("Architect")
    expect(container.textContent).toContain("Software architecture specialist")
  })

  it("switches the active detail language and updates the canonical path", async () => {
    await renderDetail()

    const zhButton = getRequiredElement("[data-detail-language=\"zh-CN\"]") as HTMLAnchorElement
    act(() => {
      zhButton.click()
    })

    expect(window.location.pathname).toBe("/agents/architect/zh-CN/")
    expect(container.textContent).toContain("软件架构专家")
  })
})

async function renderDetail() {
  await act(async () => {
    root.render(<AgentDetailPageShell item={item} initialLanguage="en" initialLocale="en" />)
    await Promise.resolve()
  })
}

function getRequiredElement(selector: string) {
  const element = container.querySelector(selector)

  if (!element) {
    throw new Error(`Element not found: ${selector}`)
  }

  return element
}
