// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { agentCatalogSnapshot } from "@/data/trait-catalog"
import { CatalogPageShell } from "@/components/agents/CatalogPageShell"
import { clearAgentDetailCache } from "@/lib/agent-detail-data"
import { buildCatalogMeta, buildEntryPayload, buildListItems, buildSearchShards } from "@/lib/catalog-loader"
import { clearSearchShardCache } from "@/lib/search-index"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

const shards = buildSearchShards(agentCatalogSnapshot)
const shardDescriptors = shards.map(({ language, url, entryCount }) => ({ language, url, entryCount }))

type FetchBehavior = "ok" | "fail" | "pending"
let entryBehavior: FetchBehavior = "ok"
let failEntriesRemaining = 0

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
    clearAgentDetailCache()
    clearSearchShardCache()
    entryBehavior = "ok"
    failEntriesRemaining = 0
    installFetchMock()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
    window.history.replaceState(null, "", "/agents/")
    window.localStorage.clear()
  })

  it("restores a contextual deep link from legacy query params", async () => {
    window.history.replaceState(null, "", "/agents/?q=reviewer&agent=typescript-reviewer&variant=en")
    await renderShell()
    await waitForDetailStatus("ready")

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
    await waitForDetailStatus("ready")
  })

  it("switches detail language while preserving the browse query", async () => {
    window.history.replaceState(null, "", "/agents/?q=reviewer&agent=typescript-reviewer&variant=en")
    await renderShell()
    await waitForDetailStatus("ready")

    const trButton = getRequiredElement('[data-testid="desktop-detail-panel"] [data-detail-language="tr"]') as HTMLAnchorElement
    act(() => {
      trButton.click()
    })

    expect(window.location.search).toContain("q=reviewer")
    expect(window.location.search).toContain("variant=tr")
  })

  it("copies the quick-view original markdown once the entry has loaded", async () => {
    window.history.replaceState(null, "", "/agents/?agent=typescript-reviewer&variant=en")
    await renderShell()
    await waitForDetailStatus("ready")

    const copyOriginalButton = getRequiredElement('[data-testid="desktop-detail-panel"] [data-copy-action="raw"]') as HTMLButtonElement
    await act(async () => {
      copyOriginalButton.click()
      await Promise.resolve()
    })

    expect(window.location.pathname).toBe("/agents/")
    expect(window.navigator.clipboard.writeText).toHaveBeenCalled()
    const copied = String(vi.mocked(window.navigator.clipboard.writeText).mock.calls.at(-1)?.[0])
    expect(copied.startsWith("---\n")).toBe(true)
    expect(copied).toContain('name: "typescript-reviewer"')
    expect(copied).toContain("\n---\n\n")
  })

  it("starts the full-text search on page load when the shared URL carries a query", async () => {
    window.history.replaceState(null, "", "/agents/?q=reviewer")
    await renderShell()
    await waitFor(() => shardRequestCount() === shards.length, "shared-URL search shards requested")

    expect(shardRequestCount()).toBe(shards.length)
  })

  it("keeps copy original disabled while the body is still loading", async () => {
    entryBehavior = "pending"
    window.history.replaceState(null, "", "/agents/?agent=typescript-reviewer&variant=en")
    await renderShell()

    const panel = getPanel("desktop")
    expect(panel.getAttribute("data-detail-status")).toBe("loading")
    expect(getRequiredElement('[data-testid="desktop-detail-panel"] [data-testid="drawer-body-loading"]')).toBeTruthy()

    const copyOriginalButton = getRequiredElement('[data-testid="desktop-detail-panel"] [data-copy-action="raw"]') as HTMLButtonElement
    expect(copyOriginalButton.disabled).toBe(true)
    act(() => {
      copyOriginalButton.click()
    })
    expect(window.navigator.clipboard.writeText).not.toHaveBeenCalled()
  })

  it("shows a failed state with retry and a canonical link, and retry requests the entry again", async () => {
    failEntriesRemaining = 2
    window.history.replaceState(null, "", "/agents/?agent=typescript-reviewer&variant=en")
    await renderShell()
    await waitForDetailStatus("failed")

    const failed = getRequiredElement('[data-testid="desktop-detail-panel"] [data-testid="drawer-body-failed"]')
    expect(failed.querySelector('a[href^="/agents/typescript-reviewer/"]')).not.toBeNull()

    const retryButton = getRequiredElement('[data-testid="desktop-detail-panel"] [data-testid="drawer-retry"]') as HTMLButtonElement
    await act(async () => {
      retryButton.click()
    })
    await waitForDetailStatus("ready")

    expect(entryRequestCount("typescript-reviewer")).toBeGreaterThanOrEqual(3)
  })

  it("shows the not-found state for an unknown agent without requesting entry JSON", async () => {
    window.history.replaceState(null, "", "/agents/?agent=does-not-exist-anywhere")
    await renderShell()

    expect(getPanel("desktop").textContent).toContain("404")
    expect(entryRequestCount("does-not-exist-anywhere")).toBe(0)
  })

  it("keeps the quick-view overlay open when switching UI locale", async () => {
    window.history.replaceState(null, "", "/agents/?agent=typescript-reviewer&variant=en")
    await renderShell()
    await waitForDetailStatus("ready")

    const localeSelect = getRequiredElement('[data-locale-select="true"]') as HTMLSelectElement
    act(() => {
      localeSelect.value = "en"
      localeSelect.dispatchEvent(new Event("change", { bubbles: true }))
    })

    expect(getPanel("desktop").textContent).toContain("Close detail")
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).not.toBeNull()
  })

  it("requests no search shard before a query is typed, and loads shards once a query is typed", async () => {
    await renderShell()
    expect(shardRequestCount()).toBe(0)

    typeIntoSearch("reviewer")
    await waitFor(() => shardRequestCount() === shards.length, "all search shards requested")

    expect(shardRequestCount()).toBe(shards.length)
    const requestsBefore = shardRequestCount()

    typeIntoSearch("reviewe")
    await act(async () => {
      await Promise.resolve()
    })
    expect(shardRequestCount()).toBe(requestsBefore)
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

const entryRequests: string[] = []
const shardRequests: string[] = []

function installFetchMock() {
  entryRequests.length = 0
  shardRequests.length = 0
  const payloadById = new Map(agentCatalogSnapshot.items.map((item) => [item.agentId, buildEntryPayload(item, agentCatalogSnapshot)]))
  const shardJsonByUrl = new Map(shards.map((shard) => [shard.url, shard.json]))

  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)

      const entryMatch = /\/data\/agents\/(.+)\.json$/.exec(url)
      if (entryMatch) {
        const agentId = decodeURIComponent(entryMatch[1])
        entryRequests.push(agentId)

        if (entryBehavior === "pending") {
          return new Promise<Response>(() => undefined)
        }
        if (failEntriesRemaining > 0) {
          failEntriesRemaining -= 1
          return Promise.resolve(new Response("nope", { status: 500 }))
        }

        const payload = payloadById.get(agentId)
        return Promise.resolve(
          payload ? new Response(JSON.stringify(payload), { status: 200 }) : new Response("missing", { status: 404 })
        )
      }

      if (url.startsWith("/data/search/")) {
        shardRequests.push(url)
        const json = shardJsonByUrl.get(url)
        return Promise.resolve(json ? new Response(json, { status: 200 }) : new Response("missing", { status: 404 }))
      }

      return Promise.reject(new Error(`Unexpected request: ${url}`))
    })
  )
}

function entryRequestCount(agentId: string) {
  return entryRequests.filter((requested) => requested === agentId).length
}

function shardRequestCount() {
  return shardRequests.length
}

async function renderShell() {
  await act(async () => {
    root.render(
      <CatalogPageShell
        items={buildListItems(agentCatalogSnapshot)}
        meta={buildCatalogMeta(agentCatalogSnapshot)}
        searchShards={shardDescriptors}
        initialLocale="zh-CN"
      />
    )
    await Promise.resolve()
  })
}

function typeIntoSearch(value: string) {
  const input = getRequiredElement('input[aria-label]') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

async function waitForDetailStatus(status: string) {
  await waitFor(() => getPanel("desktop").getAttribute("data-detail-status") === status, `detail status ${status}`)
}

async function waitFor(predicate: () => boolean, label: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) {
      return
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  }
  throw new Error(`Timed out waiting for ${label}`)
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
