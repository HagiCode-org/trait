// @vitest-environment jsdom

import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { agentCatalogSnapshot, defaultFilterState, emptyDetailRouteState, type AgentCatalogSnapshot, type RouteState } from "@/data/trait-catalog"
import { zhCnMessages } from "@/i18n/locales/zh-CN"
import { buildFilterOptions } from "@/lib/trait-builder"

import { AgentAggregatorShell } from "./AgentAggregatorShell"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

describe("AgentAggregatorShell", () => {
  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it("keeps the first viewport focused on the workbench and catalog grid", () => {
    renderShell()

    const workbench = getByTestId("catalog-workbench")
    const catalogGrid = getByTestId("catalog-grid")

    expect(workbench.compareDocumentPosition(catalogGrid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('[data-testid="source-summary-strip"]')).toBeNull()
    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).toBeNull()
  })

  it("renders an actionable empty state and resets filters", () => {
    const onResetFilters = vi.fn()

    renderShell({
      results: [],
      onResetFilters,
    })

    const resetButton = getButton(zhCnMessages.clearFilters)
    expect(getByTestId("catalog-empty-state").textContent).toContain(zhCnMessages.emptyTitle)

    act(() => {
      resetButton.click()
    })

    expect(onResetFilters).toHaveBeenCalledTimes(1)
  })

  it("keeps cards dense by capping the visible tool preview", () => {
    const baseItem = agentCatalogSnapshot.items[0]
    const denseItem = {
      ...baseItem,
      agentId: "dense-agent",
      name: "Dense Agent",
      tools: ["git", "bash", "docker", "pnpm", "node"],
    }
    const snapshot: AgentCatalogSnapshot = {
      ...agentCatalogSnapshot,
      items: [denseItem],
    }

    renderShell({
      snapshot,
      results: [denseItem],
    })

    const card = container.querySelector('[data-agent-card-id="dense-agent"]')
    expect(card?.querySelectorAll("[data-tool-chip]")).toHaveLength(3)
    expect(card?.textContent).toContain("+2")
  })

  it("renders contextual recovery when a deep link no longer resolves", () => {
    renderShell({
      detail: null,
      detailNotFound: true,
    })

    expect(container.querySelector('[data-testid="desktop-detail-layer"]')).not.toBeNull()
    expect(getByTestId("desktop-detail-panel").textContent).toContain(zhCnMessages.detailNotFoundTitle)
  })
})

function renderShell(overrides: Partial<ComponentProps<typeof AgentAggregatorShell>> = {}) {
  const snapshot = overrides.snapshot ?? agentCatalogSnapshot
  const routeState: RouteState = {
    filters: defaultFilterState,
    detail: emptyDetailRouteState,
  }

  act(() => {
    root.render(
      <AgentAggregatorShell
        snapshot={snapshot}
        locale="zh-CN"
        messages={zhCnMessages}
        routeState={routeState}
        filterState={routeState.filters}
        filterOptions={buildFilterOptions(snapshot)}
        results={snapshot.items}
        detail={null}
        detailNotFound={false}
        copyState="idle"
        onLocaleChange={vi.fn()}
        onQueryChange={vi.fn()}
        onSourceChange={vi.fn()}
        onLanguageFilterChange={vi.fn()}
        onTypeChange={vi.fn()}
        onResetFilters={vi.fn()}
        onOpenAgent={vi.fn()}
        onCloseDetail={vi.fn()}
        onSelectDetailLanguage={vi.fn()}
        onCopyLink={vi.fn()}
        {...overrides}
      />
    )
  })
}

function getButton(label: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  )

  if (!button) {
    throw new Error(`Button not found: ${label}`)
  }

  return button
}

function getByTestId(testId: string) {
  const node = container.querySelector(`[data-testid="${testId}"]`)

  if (!node) {
    throw new Error(`Test id not found: ${testId}`)
  }

  return node
}
