import { useCallback, useEffect, useMemo, useState } from "react"

import {
  agentCatalogSnapshot,
  defaultFilterState,
  emptyDetailRouteState,
  type ContentLanguage,
  type RouteState,
} from "@/data/trait-catalog"
import { AgentAggregatorShell } from "@/features/agents/components/AgentAggregatorShell"
import {
  buildFilterOptions,
  pickDetailLanguage,
  queryCatalog,
  readRouteStateFromSearch,
  resolveAgentDetail,
  writeRouteStateToSearch,
} from "@/lib/trait-builder"
import { useLocale } from "@/i18n/use-locale"

const COPY_RESET_MS = 1600

function readInitialRouteState(): RouteState {
  if (typeof window === "undefined") {
    return {
      filters: defaultFilterState,
      detail: emptyDetailRouteState,
    }
  }

  return readRouteStateFromSearch(window.location.search)
}

function buildUrl(search: string) {
  return `${window.location.pathname}${search}${window.location.hash}`
}

export default function App() {
  const { locale, messages, setLocale } = useLocale()
  const [routeState, setRouteState] = useState<RouteState>(() => readInitialRouteState())
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle")

  const filterOptions = useMemo(() => buildFilterOptions(agentCatalogSnapshot), [])
  const results = useMemo(
    () => queryCatalog(routeState.filters, agentCatalogSnapshot.items),
    [routeState.filters]
  )
  const detail = useMemo(
    () => resolveAgentDetail(routeState.detail.agentId, routeState.detail.language, agentCatalogSnapshot),
    [routeState.detail.agentId, routeState.detail.language]
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
    const item = agentCatalogSnapshot.items.find((entry) => entry.agentId === agentId)
    if (!item) {
      return
    }

    const preferredLanguage = routeState.filters.contentLanguage !== "all"
      ? pickDetailLanguage(item, routeState.filters.contentLanguage)
      : pickDetailLanguage(item, language)

    if (routeState.detail.agentId === agentId && routeState.detail.language === preferredLanguage) {
      return
    }

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
    if (!routeState.detail.agentId && !detailNotFound) {
      return
    }

    applyRouteState(
      {
        filters: routeState.filters,
        detail: emptyDetailRouteState,
      },
      "push"
    )
  }

  function selectDetailLanguage(language: ContentLanguage) {
    if (!routeState.detail.agentId || routeState.detail.language === language) {
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
    if (typeof window === "undefined") {
      return
    }

    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState("done")
    } catch {
      setCopyState("failed")
    }
  }

  return (
    <AgentAggregatorShell
      snapshot={agentCatalogSnapshot}
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
