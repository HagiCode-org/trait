// Client-safe route helpers. Nothing here reads the catalog snapshot: every list a helper
// needs (sources, content languages, agent types, counts) is an explicit argument, supplied
// by the page as props, or by a loaded payload. See src/lib/import-boundary.test.ts.

import {
  DEFAULT_UI_LOCALE,
  defaultFilterState,
  emptyDetailRouteState,
  resolveUiLocale,
  type AgentDetailItem,
  type AgentDetailPayload,
  type AgentDetailVariant,
  type AgentType,
  type CatalogListItem,
  type CatalogMeta,
  type ContentLanguage,
  type DetailRouteState,
  type FilterState,
  type RouteState,
  type SourceMeta,
  type UiLocale,
} from "@/data/ui-constants"

export type FilterOption<T extends string> = {
  value: T | "all"
  count: number
}

export type CatalogFilterOptions = {
  sources: FilterOption<string>[]
  languages: FilterOption<ContentLanguage>[]
  types: FilterOption<AgentType>[]
}

export type AgentDetailView = {
  item: AgentDetailItem
  source: SourceMeta | null
  activeLanguage: ContentLanguage
  requestedLanguage: ContentLanguage | null
  fallbackLanguage: ContentLanguage | null
  activeVariant: AgentDetailVariant
}

/**
 * What the listing drawer shows for the URL's `agent` parameter. `loading` and `failed` use only
 * list-level data; `ready` carries the loaded entry.
 */
export type DrawerState =
  | { status: "not-found" }
  | {
      status: "loading" | "failed"
      item: CatalogListItem
      source: SourceMeta | null
      activeLanguage: ContentLanguage
      fallbackLanguage: ContentLanguage | null
    }
  | { status: "ready"; view: AgentDetailView }

/** Route-state validation needs only these lists from the catalog. */
export type CatalogRouteLists = Pick<CatalogMeta, "sources" | "contentLanguages" | "agentTypes">

const SEARCH_QUERY_KEY = "q"
const SEARCH_SOURCE_KEY = "source"
const SEARCH_LANGUAGE_KEY = "content"
const SEARCH_TYPE_KEY = "type"
const SEARCH_AGENT_KEY = "agent"
const SEARCH_VARIANT_KEY = "variant"

export function buildFilterOptions(meta: CatalogMeta): CatalogFilterOptions {
  return {
    sources: [
      { value: "all", count: meta.totalAgents },
      ...meta.sources.map((source) => ({
        value: source.id,
        count: meta.sourceCounts[source.id] ?? 0,
      })),
    ],
    languages: [
      { value: "all", count: meta.totalAgents },
      ...meta.contentLanguages.map((language) => ({
        value: language,
        count: meta.languageCounts[language] ?? 0,
      })),
    ],
    types: [
      { value: "all", count: meta.totalAgents },
      ...meta.agentTypes.map((agentType) => ({
        value: agentType,
        count: meta.typeCounts[agentType] ?? 0,
      })),
    ],
  }
}

/**
 * Filters and ranks list items. A query matches an item when its metadata text contains it,
 * or when `fullText` (lower-cased variant title, summary and plain text from loaded search
 * shards, keyed by agentId) contains it. Ordering is the relevance score, then name.
 */
export function queryCatalog(
  filters: FilterState,
  items: CatalogListItem[],
  fullText: ReadonlyMap<string, string> = new Map()
): CatalogListItem[] {
  const normalizedQuery = filters.query.trim().toLowerCase()

  return items
    .filter((item) => {
      if (filters.sourceId !== "all" && item.sourceId !== filters.sourceId) {
        return false
      }

      if (filters.contentLanguage !== "all" && !item.availableLanguages.includes(filters.contentLanguage)) {
        return false
      }

      if (filters.agentType !== "all" && item.type !== filters.agentType) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return buildMetadataSearchText(item).includes(normalizedQuery) || Boolean(fullText.get(item.agentId)?.includes(normalizedQuery))
    })
    .sort((left, right) => scoreItem(right, normalizedQuery) - scoreItem(left, normalizedQuery) || left.name.localeCompare(right.name))
}

/** The metadata part of search text: everything except variant titles, summaries and bodies. */
export function buildMetadataSearchText(item: CatalogListItem): string {
  return [
    item.agentId,
    item.sourceAgentId,
    item.name,
    item.summary,
    item.type,
    item.sourceLabel,
    item.sourceRepo,
    item.model ?? "",
    item.canonicalPath,
    ...item.tags,
    ...item.tools,
    ...item.availableLanguages,
  ]
    .join(" ")
    .toLowerCase()
}

/** Resolves the entry a detail view shows from a loaded payload, honouring the requested language. */
export function resolveAgentDetail(payload: AgentDetailPayload | null, requestedLanguage: ContentLanguage | null): AgentDetailView | null {
  if (!payload) {
    return null
  }

  const { item, source } = payload
  const activeLanguage = pickDetailLanguage(item, requestedLanguage)
  const activeVariant = item.variants[activeLanguage]
  if (!activeVariant) {
    return null
  }

  return {
    item,
    source,
    activeLanguage,
    requestedLanguage,
    fallbackLanguage: requestedLanguage && requestedLanguage !== activeLanguage ? activeLanguage : null,
    activeVariant,
  }
}

export function pickDetailLanguage(
  item: Pick<CatalogListItem, "availableLanguages" | "defaultLanguage">,
  requestedLanguage: ContentLanguage | null
): ContentLanguage {
  if (requestedLanguage && item.availableLanguages.includes(requestedLanguage)) {
    return requestedLanguage
  }

  if (item.availableLanguages.includes(item.defaultLanguage)) {
    return item.defaultLanguage
  }

  return item.availableLanguages[0] ?? item.defaultLanguage ?? "en"
}

export function projectDetailLanguageToUiLocale(language: ContentLanguage | null | undefined): UiLocale | null {
  return resolveUiLocale(language)
}

export function deriveDetailUiLocale(
  language: ContentLanguage | null | undefined,
  fallbackLocale: UiLocale = DEFAULT_UI_LOCALE
): UiLocale {
  return projectDetailLanguageToUiLocale(language) ?? fallbackLocale
}

export function readRouteStateFromSearch(search: string, lists: CatalogRouteLists): RouteState {
  const params = new URLSearchParams(search)

  return {
    filters: {
      query: params.get(SEARCH_QUERY_KEY)?.trim() ?? defaultFilterState.query,
      sourceId: sanitizeSource(params.get(SEARCH_SOURCE_KEY), lists),
      contentLanguage: sanitizeLanguage(params.get(SEARCH_LANGUAGE_KEY), lists),
      agentType: sanitizeType(params.get(SEARCH_TYPE_KEY), lists),
    },
    detail: {
      agentId: params.get(SEARCH_AGENT_KEY)?.trim() || emptyDetailRouteState.agentId,
      language: sanitizeDetailLanguage(params.get(SEARCH_VARIANT_KEY), lists),
    },
  }
}

export function writeRouteStateToSearch(state: RouteState): string {
  const params = new URLSearchParams()

  if (state.filters.query.trim()) {
    params.set(SEARCH_QUERY_KEY, state.filters.query.trim())
  }
  if (state.filters.sourceId !== "all") {
    params.set(SEARCH_SOURCE_KEY, state.filters.sourceId)
  }
  if (state.filters.contentLanguage !== "all") {
    params.set(SEARCH_LANGUAGE_KEY, state.filters.contentLanguage)
  }
  if (state.filters.agentType !== "all") {
    params.set(SEARCH_TYPE_KEY, state.filters.agentType)
  }
  if (state.detail.agentId) {
    params.set(SEARCH_AGENT_KEY, state.detail.agentId)
  }
  if (state.detail.language) {
    params.set(SEARCH_VARIANT_KEY, state.detail.language)
  }

  const query = params.toString()
  return query ? `?${query}` : ""
}

export function buildDetailLink(state: RouteState, agentId: string, language: ContentLanguage | null): string {
  return writeRouteStateToSearch({
    filters: state.filters,
    detail: {
      agentId,
      language,
    },
  })
}

export function buildAgentPath(agentId: string): string {
  return `/agents/${agentId}/`
}

export function buildAgentLanguagePath(
  item: Pick<CatalogListItem, "agentId" | "defaultLanguage">,
  language: ContentLanguage
): string {
  if (language === item.defaultLanguage) {
    return buildAgentPath(item.agentId)
  }

  return `/agents/${item.agentId}/${language}/`
}

export function buildAgentAlternatePaths(
  item: Pick<CatalogListItem, "agentId" | "defaultLanguage" | "availableLanguages">
): Record<ContentLanguage, string> {
  return Object.fromEntries(item.availableLanguages.map((language) => [language, buildAgentLanguagePath(item, language)]))
}

export function buildCatalogPagePath(state: RouteState): string {
  const search = writeRouteStateToSearch(state)
  return `/agents/${search}`
}

export function buildLegacyCatalogRedirect(search: string): string {
  return `/agents/${search || ""}`
}

export function getFreshnessState(lastSyncedAt: string): "fresh" | "watch" | "stale" {
  const ageMs = Math.max(0, Date.now() - new Date(lastSyncedAt).getTime())
  const ageDays = ageMs / (1000 * 60 * 60 * 24)

  if (ageDays <= 3) {
    return "fresh"
  }
  if (ageDays <= 14) {
    return "watch"
  }
  return "stale"
}

export function humanizeCatalogValue(value: string) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function sanitizeSource(value: string | null, lists: CatalogRouteLists): FilterState["sourceId"] {
  if (!value || value === "all") {
    return "all"
  }

  return lists.sources.some((source) => source.id === value) ? value : "all"
}

function sanitizeLanguage(value: string | null, lists: CatalogRouteLists): FilterState["contentLanguage"] {
  if (!value || value === "all") {
    return "all"
  }

  return lists.contentLanguages.includes(value) ? value : "all"
}

function sanitizeType(value: string | null, lists: CatalogRouteLists): FilterState["agentType"] {
  if (!value || value === "all") {
    return "all"
  }

  return lists.agentTypes.includes(value) ? value : "all"
}

function sanitizeDetailLanguage(value: string | null, lists: CatalogRouteLists): DetailRouteState["language"] {
  return value !== null && lists.contentLanguages.includes(value) ? value : null
}

function scoreItem(item: CatalogListItem, normalizedQuery: string) {
  if (!normalizedQuery) {
    return 0
  }

  let score = 0
  const name = item.name.toLowerCase()
  const summary = item.summary.toLowerCase()
  const tags = item.tags.join(" ").toLowerCase()
  const agentId = item.agentId.toLowerCase()
  const type = item.type.toLowerCase()

  if (name.includes(normalizedQuery)) {
    score += 6
  }
  if (summary.includes(normalizedQuery)) {
    score += 4
  }
  if (tags.includes(normalizedQuery)) {
    score += 3
  }
  if (agentId.includes(normalizedQuery)) {
    score += 3
  }
  if (type.includes(normalizedQuery)) {
    score += 2
  }
  if (item.availableLanguages.includes(normalizedQuery as ContentLanguage)) {
    score += 2
  }
  if (item.tools.some((tool) => tool.toLowerCase().includes(normalizedQuery))) {
    score += 2
  }

  return score
}
