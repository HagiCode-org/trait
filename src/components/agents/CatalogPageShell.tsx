import { useCallback, useEffect, useMemo, useState } from "react"

import {
  defaultFilterState,
  emptyDetailRouteState,
  type CatalogListItem,
  type CatalogMeta,
  type ContentLanguage,
  type RouteState,
  type SearchShardDescriptor,
  type UiLocale,
} from "@/data/ui-constants"
import { useLocale } from "@/i18n/use-locale"
import { useAgentDetail } from "@/lib/agent-detail-data"
import { buildAgentVariantMarkdown } from "@/lib/agent-markdown"
import {
  buildAgentLanguagePath,
  buildFilterOptions,
  pickDetailLanguage,
  queryCatalog,
  readRouteStateFromSearch,
  resolveAgentDetail,
  writeRouteStateToSearch,
  type DrawerState,
} from "@/lib/route-projection"
import { useSearchIndex } from "@/lib/search-index"
import { AgentAggregatorShell } from "@/features/agents/components/AgentAggregatorShell"

const COPY_RESET_MS = 1600

function readInitialRouteState(meta: CatalogMeta): RouteState {
  if (typeof window !== "undefined") {
    return readRouteStateFromSearch(window.location.search, meta)
  }

  return {
    filters: defaultFilterState,
    detail: emptyDetailRouteState,
  }
}

function buildUrl(search: string) {
  return `/agents/${search}${window.location.hash}`
}

type CatalogPageShellProps = {
  items: CatalogListItem[]
  meta: CatalogMeta
  searchShards: SearchShardDescriptor[]
  initialLocale?: UiLocale
}

export function CatalogPageShell({ items, meta, searchShards, initialLocale = "en" }: CatalogPageShellProps) {
  const { locale, messages, setLocale } = useLocale(initialLocale)
  const [routeState, setRouteState] = useState<RouteState>(() => readInitialRouteState(meta))
  const [copyLinkState, setCopyLinkState] = useState<"idle" | "done" | "failed">("idle")
  const [copyOriginalState, setCopyOriginalState] = useState<"idle" | "done" | "failed">("idle")

  const itemsById = useMemo(() => new Map(items.map((item) => [item.agentId, item])), [items])
  const filterOptions = useMemo(() => buildFilterOptions(meta), [meta])
  const search = useSearchIndex({
    active: routeState.filters.query.trim().length > 0,
    contentLanguage: routeState.filters.contentLanguage,
    shards: searchShards,
  })
  const results = useMemo(
    () => queryCatalog(routeState.filters, items, search.fullText),
    [routeState.filters, items, search.fullText]
  )

  const detailItem = routeState.detail.agentId ? itemsById.get(routeState.detail.agentId) ?? null : null
  const entry = useAgentDetail(detailItem ? detailItem.agentId : null)
  const drawer = useMemo(
    () => buildDrawerState(routeState, detailItem, entry.state, meta),
    [routeState, detailItem, entry.state, meta]
  )

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

    function handlePopState() {
      setRouteState(readRouteStateFromSearch(window.location.search, meta))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [meta])

  useEffect(() => {
    if (copyLinkState === "idle") {
      return undefined
    }

    const timer = window.setTimeout(() => setCopyLinkState("idle"), COPY_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copyLinkState])

  useEffect(() => {
    if (copyOriginalState === "idle") {
      return undefined
    }

    const timer = window.setTimeout(() => setCopyOriginalState("idle"), COPY_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copyOriginalState])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    document.documentElement.lang = locale
  }, [locale])

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
    const item = itemsById.get(agentId)
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
    if (typeof window === "undefined" || !drawer || drawer.status === "not-found") {
      return
    }

    try {
      const activeLanguage = drawer.status === "ready" ? drawer.view.activeLanguage : drawer.activeLanguage
      const item = drawer.status === "ready" ? drawer.view.item : drawer.item
      const href = new URL(buildAgentLanguagePath(item, activeLanguage), window.location.origin).toString()
      await navigator.clipboard.writeText(href)
      setCopyLinkState("done")
    } catch {
      setCopyLinkState("failed")
    }
  }

  async function copyCurrentOriginal() {
    // Copy original needs the loaded body; the button is disabled until the entry has loaded.
    if (typeof window === "undefined" || !drawer || drawer.status !== "ready") {
      return
    }

    try {
      await navigator.clipboard.writeText(buildAgentVariantMarkdown(drawer.view.activeVariant))
      setCopyOriginalState("done")
    } catch {
      setCopyOriginalState("failed")
    }
  }

  return (
    <AgentAggregatorShell
      locale={locale}
      messages={messages}
      routeState={routeState}
      filterState={routeState.filters}
      filterOptions={filterOptions}
      results={results}
      drawer={drawer}
      searchStatus={search.status}
      copyLinkState={copyLinkState}
      copyOriginalState={copyOriginalState}
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
      onCopyOriginal={copyCurrentOriginal}
      onRetryDetail={entry.retry}
      onRetrySearch={search.retry}
    />
  )
}

/** Maps the URL's `agent` parameter to what the drawer shows: not-found, loading, failed or ready. */
function buildDrawerState(
  routeState: RouteState,
  listItem: CatalogListItem | null,
  loadState: ReturnType<typeof useAgentDetail>["state"],
  meta: CatalogMeta
): DrawerState | null {
  if (!routeState.detail.agentId) {
    return null
  }

  if (!listItem) {
    return { status: "not-found" }
  }

  if (loadState.status === "ready") {
    const view = resolveAgentDetail(loadState.payload, routeState.detail.language)
    if (view) {
      return { status: "ready", view }
    }
  }

  const activeLanguage = pickDetailLanguage(listItem, routeState.detail.language)
  const requested = routeState.detail.language
  const settledWithoutBody = loadState.status === "failed" || loadState.status === "ready"
  return {
    status: settledWithoutBody ? "failed" : "loading",
    item: listItem,
    source: meta.sources.find((source) => source.id === listItem.sourceId) ?? null,
    activeLanguage,
    fallbackLanguage: requested && requested !== activeLanguage ? activeLanguage : null,
  }
}
