// @vitest-environment jsdom

import { act, type ComponentProps } from "react"
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
    document.head.innerHTML = [
      '<link rel="canonical" href="https://trait.hagicode.com/agents/architect/" />',
      '<meta property="og:url" content="https://trait.hagicode.com/agents/architect/" />',
    ].join("")
    window.localStorage.clear()
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
    document.head.innerHTML = ""
    vi.restoreAllMocks()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
  })

  it("renders the canonical detail heading and markdown body", async () => {
    await renderDetail()

    expect(container.querySelector("h1")?.textContent).toContain("Architect")
    expect(container.textContent).toContain("Software architecture specialist")
  })

  it("honors the route locale over stored preference on a zh-CN deep link", async () => {
    window.localStorage.setItem("trait-ui-locale", "en")

    await renderDetail({
      initialLanguage: "zh-CN",
      initialLocale: "zh-CN",
    })

    expect(document.documentElement.lang).toBe("zh-CN")
    expect((getRequiredElement('[data-locale-select="true"]') as HTMLSelectElement).value).toBe("zh-CN")
    expect(container.textContent).toContain("返回目录")
    expect(container.textContent).toContain("软件架构专家")
  })

  it("switches detail language and canonical path from the header locale switch", async () => {
    await renderDetail({
      initialLanguage: "en",
      initialLocale: "en",
    })

    const localeSelect = getRequiredElement('[data-locale-select="true"]') as HTMLSelectElement
    act(() => {
      localeSelect.value = "zh-CN"
      localeSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(window.location.pathname).toBe("/agents/architect/zh-CN/")
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("http://localhost:3000/agents/architect/zh-CN/")
    expect(container.textContent).toContain("返回目录")
    expect(container.textContent).toContain("软件架构专家")
  })

  it("switches the active detail language, chrome locale, and canonical path", async () => {
    await renderDetail({
      initialLanguage: "zh-CN",
      initialLocale: "zh-CN",
    })

    const enButton = getRequiredElement("[data-detail-language=\"en\"]") as HTMLAnchorElement
    act(() => {
      enButton.click()
    })

    expect(window.location.pathname).toBe("/agents/architect/")
    expect(document.documentElement.lang).toBe("en")
    expect((getRequiredElement('[data-locale-select="true"]') as HTMLSelectElement).value).toBe("en")
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("http://localhost:3000/agents/architect/")
    expect(container.textContent).toContain("Back to catalog")
  })

  it("updates the canonical path when switching to another supported locale", async () => {
    await renderDetail()

    const zhButton = getRequiredElement("[data-detail-language=\"zh-CN\"]") as HTMLAnchorElement
    act(() => {
      zhButton.click()
    })

    expect(window.location.pathname).toBe("/agents/architect/zh-CN/")
    expect(document.documentElement.lang).toBe("zh-CN")
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("http://localhost:3000/agents/architect/zh-CN/")
    expect(container.textContent).toContain("软件架构专家")
  })

  it("copies the active agent original markdown", async () => {
    await renderDetail()

    const copyOriginalButton = getRequiredElement('[data-copy-action="raw"]') as HTMLButtonElement
    await act(async () => {
      copyOriginalButton.click()
      await Promise.resolve()
    })

    expect(window.navigator.clipboard.writeText).toHaveBeenCalled()
    expect(vi.mocked(window.navigator.clipboard.writeText).mock.calls.at(-1)?.[0]).toContain("# Architect")
    expect(copyOriginalButton.textContent).toBe("Copied")
  })

  it("shows a failure message when copy original cannot use any clipboard path", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))
    const execCommand = vi.fn().mockReturnValue(false)
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    })

    await renderDetail()

    const copyOriginalButton = getRequiredElement('[data-copy-action="raw"]') as HTMLButtonElement
    await act(async () => {
      copyOriginalButton.click()
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalled()
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(copyOriginalButton.textContent).toBe("Copy failed")
  })
})

async function renderDetail(
  props: Partial<ComponentProps<typeof AgentDetailPageShell>> = {}
) {
  await act(async () => {
    root.render(
      <AgentDetailPageShell
        item={item}
        initialLanguage={props.initialLanguage ?? "en"}
        initialLocale={props.initialLocale ?? "en"}
      />
    )
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
