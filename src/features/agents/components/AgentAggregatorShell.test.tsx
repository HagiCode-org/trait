// @vitest-environment jsdom

import { act, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { agentCatalogSnapshot, defaultFilterState, emptyDetailRouteState, type RouteState } from "@/data/trait-catalog"
import { zhCnMessages } from "@/i18n/locales/zh-CN"
import { buildFilterOptions, resolveAgentDetail } from "@/lib/trait-builder"

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

  it("renders an actionable empty state and resets filters", () => {
    const onResetFilters = vi.fn()

    renderShell({
      results: [],
      onResetFilters,
    })

    const resetButton = getButton(zhCnMessages.clearFilters)
    expect(container.textContent).toContain(zhCnMessages.emptyTitle)

    act(() => {
      resetButton.click()
    })

    expect(onResetFilters).toHaveBeenCalledTimes(1)
  })

  it("shows warning status without blocking the catalog shell", () => {
    const snapshot = structuredClone(agentCatalogSnapshot)
    snapshot.warnings = [
      {
        code: "fetch_failed",
        agentId: "typescript-reviewer",
        language: "tr",
        message: "fixture warning",
      },
    ]

    renderShell({ snapshot })

    expect(container.textContent).toContain(zhCnMessages.warningTitle)
    expect(container.textContent).toContain(zhCnMessages.catalogTitle)
  })

  it("supports detail language switching and mobile close fallback", () => {
    const onSelectDetailLanguage = vi.fn()
    const onCloseDetail = vi.fn()

    renderShell({
      detail: resolveAgentDetail("typescript-reviewer", "en", agentCatalogSnapshot),
      onSelectDetailLanguage,
      onCloseDetail,
    })

    const trButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "tr"
    )
    const closeButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === zhCnMessages.closeDetail
    )

    expect(container.textContent).toContain("typescript-reviewer")
    expect(trButtons.length).toBeGreaterThan(0)
    expect(closeButtons.length).toBeGreaterThan(0)

    act(() => {
      trButtons[0]?.click()
    })
    act(() => {
      closeButtons.at(-1)?.click()
    })

    expect(onSelectDetailLanguage).toHaveBeenCalledWith("tr")
    expect(onCloseDetail).toHaveBeenCalledTimes(1)
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
