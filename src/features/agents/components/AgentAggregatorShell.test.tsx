// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  agentCatalogSnapshot,
  defaultFilterState,
  emptyDetailRouteState,
  type FilterState,
} from "@/data/trait-catalog"
import { enMessages } from "@/i18n/locales/en"
import { buildFilterOptions, queryCatalog } from "@/lib/route-projection"

import { AgentAggregatorShell } from "./AgentAggregatorShell"

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
const SETTLE_MS = 400
const filterOptions = buildFilterOptions(agentCatalogSnapshot)

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let capture: ReturnType<typeof vi.fn>

function countFor(filters: FilterState) {
  return queryCatalog(filters, agentCatalogSnapshot.items).length
}

function renderShell(filters: FilterState) {
  act(() => {
    root.render(
      <AgentAggregatorShell
        snapshot={agentCatalogSnapshot}
        locale="en"
        messages={enMessages}
        routeState={{ filters, detail: emptyDetailRouteState }}
        filterState={filters}
        filterOptions={filterOptions}
        results={queryCatalog(filters, agentCatalogSnapshot.items)}
        detail={null}
        detailNotFound={false}
        copyLinkState="idle"
        copyOriginalState="idle"
        onLocaleChange={() => {}}
        onQueryChange={() => {}}
        onSourceChange={() => {}}
        onLanguageFilterChange={() => {}}
        onTypeChange={() => {}}
        onResetFilters={() => {}}
        onOpenAgent={() => {}}
        onCloseDetail={() => {}}
        onSelectDetailLanguage={() => {}}
        onCopyLink={() => {}}
        onCopyOriginal={() => {}}
      />
    )
  })
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe("AgentAggregatorShell catalog_searched event", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    capture = vi.fn()
    ;(window as unknown as { posthog?: unknown }).posthog = {
      __loaded: true,
      capture,
      has_opted_out_capturing: () => false,
    }
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    delete (window as unknown as { posthog?: unknown }).posthog
    vi.useRealTimers()
    vi.restoreAllMocks()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
  })

  it("sends nothing on the initial render, even after the settle window", () => {
    renderShell(defaultFilterState)

    advance(5_000)

    expect(capture).not.toHaveBeenCalled()
  })

  it("sends one event for a typing burst, after the query settles", () => {
    renderShell(defaultFilterState)

    renderShell({ ...defaultFilterState, query: "a" })
    advance(100)
    renderShell({ ...defaultFilterState, query: "ar" })
    advance(100)
    renderShell({ ...defaultFilterState, query: "arc" })
    advance(SETTLE_MS - 1)
    expect(capture).not.toHaveBeenCalled()

    advance(1)
    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith("catalog_searched", { results_count: countFor({ ...defaultFilterState, query: "arc" }) })
  })

  it("sends one event when a filter is clearing back to the unfiltered list", () => {
    renderShell({ ...defaultFilterState, query: "architect" })
    renderShell(defaultFilterState)
    advance(SETTLE_MS)

    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenLastCalledWith("catalog_searched", { results_count: agentCatalogSnapshot.items.length })
  })

  it("sends a source filter change and no event when the settled state is unchanged", () => {
    renderShell(defaultFilterState)
    const sourceId = filterOptions.sources.find((option) => option.value !== "all")?.value as FilterState["sourceId"]
    const filters = { ...defaultFilterState, sourceId }

    renderShell(filters)
    advance(SETTLE_MS)
    expect(capture).toHaveBeenCalledTimes(1)

    renderShell({ ...filters })
    advance(5_000)
    expect(capture).toHaveBeenCalledTimes(1)
  })

  it("sends a payload that carries only results_count, never the search term", () => {
    renderShell(defaultFilterState)
    renderShell({ ...defaultFilterState, query: "architect" })
    advance(SETTLE_MS)

    expect(capture).toHaveBeenCalledTimes(1)
    const [name, properties] = capture.mock.calls[0]
    expect(name).toBe("catalog_searched")
    expect(properties).toEqual({ results_count: countFor({ ...defaultFilterState, query: "architect" }) })
    expect(Object.keys(properties)).toEqual(["results_count"])
    expect(JSON.stringify(properties)).not.toContain("architect")
  })
})
