import { useCallback, useEffect, useMemo, useState } from "react"

import {
  defaultFilterState,
  emptyDetailRouteState,
  type AgentCatalogSnapshot,
  type ContentLanguage,
  type RouteState,
  type UiLocale,
} from "@/data/trait-catalog"
import { useLocale } from "@/i18n/use-locale"
import {
  buildAgentLanguagePath,
  buildFilterOptions,
  pickDetailLanguage,
  queryCatalog,
  readRouteStateFromSearch,
  resolveAgentDetail,
  writeRouteStateToSearch,
} from "@/lib/route-projection"
import { useAnalyticsBootstrap } from "@/lib/use-analytics"
import { AgentAggregatorShell } from "@/features/agents/components/AgentAggregatorShell"

const COPY_RESET_MS = 1600

function readInitialRouteState(): RouteState {
  return {
    filters: defaultFilterState,
    detail: emptyDetailRouteState,
  }
}

function buildUrl(search: string) {
  return `/agents/${search}${window.location.hash}`
}

type CatalogPageShellProps = {
  snapshot: AgentCatalogSnapshot
  initialLocale?: UiLocale
}

export function CatalogPageShell({ snapshot, initialLocale = "en" }: CatalogPageShellProps) {
  const { locale, messages, setLocale } = useLocale(initialLocale)
  const [routeState, setRouteState] = useState<RouteState>(() => readInitialRouteState())
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle")

  useAnalyticsBootstrap()

  const filterOptions = useMemo(() => buildFilterOptions(snapshot), [snapshot])
  const results = useMemo(() => queryCatalog(routeState.filters, snapshot.items), [routeState.filters, snapshot.items])
  const detail = useMemo(
    () => resolveAgentDetail(routeState.detail.agentId, routeState.detail.language, snapshot),
    [routeState.detail.agentId, routeState.detail.language, snapshot]
  )
  const detailNotFound = Boolean(routeState.detail.agentId) && !detail

  const applyRouteState = useCallback((nextState: RouteState, historyMode: "push" | "replace") => {
    setRouteState(nextState)

    if (typeof window === "undefined") {
      return
    }

    const nextSearch = writeRouteStateToSearch(nextState)
    const nextUrl = buildUrl(nextSearch)

    if (historyMode === "push") {
      window.history.pushState(null, "", nextUrl)
      return
    }

    window.history.replaceState(null, "", nextUrl)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    setRouteState(readRouteStateFromSearch(window.location.search))

    function handlePopState() {
      setRouteState(readRouteStateFromSearch(window.location.search))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (copyState === "idle") {
      return undefined
    }

    const timer = window.setTimeout(() => setCopyState("idle"), COPY_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function updateFilters(partial: Partial<RouteState["filters"]>) {
    applyRouteState(
      {
        filters: {
          ...routeState.filters,
          ...partial,
        },
        detail: routeState.detail,
      },
      "replace"
    )
  }

  function resetFilters() {
    applyRouteState(
      {
        filters: defaultFilterState,
        detail: emptyDetailRouteState,
      },
      "replace"
    )
  }

  function openAgent(agentId: string, language: ContentLanguage | null) {
    const item = snapshot.items.find((entry) => entry.agentId === agentId)
    if (!item) {
      return
    }

    const preferredLanguage =
      routeState.filters.contentLanguage !== "all"
        ? pickDetailLanguage(item, routeState.filters.contentLanguage)
        : pickDetailLanguage(item, language)

    applyRouteState(
      {
        filters: routeState.filters,
        detail: {
          agentId,
          language: preferredLanguage,
        },
      },
      "push"
    )
  }

  function closeDetail() {
    applyRouteState(
      {
        filters: routeState.filters,
        detail: emptyDetailRouteState,
      },
      "push"
    )
  }

  function selectDetailLanguage(language: ContentLanguage) {
    if (!routeState.detail.agentId) {
      return
    }

    applyRouteState(
      {
        filters: routeState.filters,
        detail: {
          agentId: routeState.detail.agentId,
          language,
        },
      },
      "replace"
    )
  }

  async function copyCurrentLink() {
    if (typeof window === "undefined" || !detail) {
      return
    }

    try {
      const href = new URL(buildAgentLanguagePath(detail.item, detail.activeLanguage), window.location.origin).toString()
      await navigator.clipboard.writeText(href)
      setCopyState("done")
    } catch {
      setCopyState("failed")
    }
  }

  return (
    <AgentAggregatorShell
      snapshot={snapshot}
      locale={locale}
      messages={messages}
      routeState={routeState}
      filterState={routeState.filters}
      filterOptions={filterOptions}
      results={results}
      detail={detail}
      detailNotFound={detailNotFound}
      copyState={copyState}
      onLocaleChange={setLocale}
      onQueryChange={(query) => updateFilters({ query })}
      onSourceChange={(sourceId) => updateFilters({ sourceId })}
      onLanguageFilterChange={(contentLanguage) => updateFilters({ contentLanguage })}
      onTypeChange={(agentType) => updateFilters({ agentType })}
      onResetFilters={resetFilters}
      onOpenAgent={openAgent}
      onCloseDetail={closeDetail}
      onSelectDetailLanguage={selectDetailLanguage}
      onCopyLink={copyCurrentLink}
    />
  )
}
