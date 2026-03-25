import {
  agentCatalogSnapshot,
  defaultFilterState,
  emptyDetailRouteState,
  isAgentType,
  isContentLanguage,
  sourceCatalog,
  traitCatalog,
  type AgentCatalogItem,
  type AgentCatalogSnapshot,
  type AgentType,
  type ContentLanguage,
  type DetailRouteState,
  type FilterState,
  type RouteState,
  type SourceMeta,
} from "@/data/trait-catalog"

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
  item: AgentCatalogItem
  source: SourceMeta | null
  activeLanguage: ContentLanguage
  requestedLanguage: ContentLanguage | null
  fallbackLanguage: ContentLanguage | null
  activeVariant: AgentVariantRecordValue
}

type AgentVariantRecordValue = AgentCatalogItem["variants"][string]

const SEARCH_QUERY_KEY = "q"
const SEARCH_SOURCE_KEY = "source"
const SEARCH_LANGUAGE_KEY = "content"
const SEARCH_TYPE_KEY = "type"
const SEARCH_AGENT_KEY = "agent"
const SEARCH_VARIANT_KEY = "variant"

export function buildFilterOptions(snapshot: AgentCatalogSnapshot = agentCatalogSnapshot): CatalogFilterOptions {
  const sourceCounts = countBy(snapshot.items, (item) => item.sourceId)
  const languageCounts = countByMany(snapshot.items, (item) => item.availableLanguages)
  const typeCounts = countBy(snapshot.items, (item) => item.type)
  const languages = Object.keys(snapshot.languageIndex).sort((left, right) => left.localeCompare(right))
  const types = Array.from(new Set(snapshot.items.map((item) => item.type))).sort((left, right) => left.localeCompare(right))

  return {
    sources: [
      { value: "all", count: snapshot.items.length },
      ...snapshot.sources.map((source) => ({
        value: source.id,
        count: sourceCounts.get(source.id) ?? 0,
      })),
    ],
    languages: [
      { value: "all", count: snapshot.items.length },
      ...languages.map((language) => ({
        value: language,
        count: languageCounts.get(language) ?? 0,
      })),
    ],
    types: [
      { value: "all", count: snapshot.items.length },
      ...types.map((agentType) => ({
        value: agentType,
        count: typeCounts.get(agentType) ?? 0,
      })),
    ],
  }
}

export function queryCatalog(filters: FilterState, items: AgentCatalogItem[] = traitCatalog): AgentCatalogItem[] {
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

      return buildSearchIndex(item).includes(normalizedQuery)
    })
    .sort((left, right) => scoreItem(right, normalizedQuery) - scoreItem(left, normalizedQuery) || left.name.localeCompare(right.name))
}

export function resolveAgentDetail(
  agentId: string | null,
  requestedLanguage: ContentLanguage | null,
  snapshot: AgentCatalogSnapshot = agentCatalogSnapshot
): AgentDetailView | null {
  if (!agentId) {
    return null
  }

  const item = snapshot.items.find((entry) => entry.agentId === agentId)
  if (!item) {
    return null
  }

  const activeLanguage = pickDetailLanguage(item, requestedLanguage)
  const activeVariant = item.variants[activeLanguage]
  if (!activeVariant) {
    return null
  }

  return {
    item,
    source: snapshot.sources.find((source) => source.id === item.sourceId) ?? null,
    activeLanguage,
    requestedLanguage,
    fallbackLanguage: requestedLanguage && requestedLanguage !== activeLanguage ? activeLanguage : null,
    activeVariant,
  }
}

export function pickDetailLanguage(item: AgentCatalogItem, requestedLanguage: ContentLanguage | null): ContentLanguage {
  if (requestedLanguage && item.availableLanguages.includes(requestedLanguage)) {
    return requestedLanguage
  }

  if (item.availableLanguages.includes(item.defaultLanguage)) {
    return item.defaultLanguage
  }

  return item.availableLanguages[0] ?? item.defaultLanguage ?? "en"
}

export function readRouteStateFromSearch(search: string): RouteState {
  const params = new URLSearchParams(search)
  const nextFilters: FilterState = {
    query: params.get(SEARCH_QUERY_KEY)?.trim() ?? defaultFilterState.query,
    sourceId: sanitizeSource(params.get(SEARCH_SOURCE_KEY)),
    contentLanguage: sanitizeLanguage(params.get(SEARCH_LANGUAGE_KEY)),
    agentType: sanitizeType(params.get(SEARCH_TYPE_KEY)),
  }

  return {
    filters: nextFilters,
    detail: {
      agentId: params.get(SEARCH_AGENT_KEY)?.trim() || emptyDetailRouteState.agentId,
      language: sanitizeDetailLanguage(params.get(SEARCH_VARIANT_KEY)),
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

export function getSourceMetrics(snapshot: AgentCatalogSnapshot = agentCatalogSnapshot) {
  return snapshot.sources.map((source) => ({
    ...source,
    freshness: getFreshnessState(source.lastSyncedAt),
  }))
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

function sanitizeSource(value: string | null): FilterState["sourceId"] {
  if (!value || value === "all") {
    return "all"
  }

  return sourceCatalog.some((source) => source.id === value) ? value : "all"
}

function sanitizeLanguage(value: string | null): FilterState["contentLanguage"] {
  if (!value || value === "all") {
    return "all"
  }

  return isContentLanguage(value) ? value : "all"
}

function sanitizeType(value: string | null): FilterState["agentType"] {
  if (!value || value === "all") {
    return "all"
  }

  return isAgentType(value) ? value : "all"
}

function sanitizeDetailLanguage(value: string | null): DetailRouteState["language"] {
  return isContentLanguage(value) ? value : null
}

function buildSearchIndex(item: AgentCatalogItem) {
  return [
    item.agentId,
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
    ...item.availableLanguages.flatMap((language) => {
      const variant = item.variants[language]
      return variant ? [variant.title, variant.summary, variant.bodyPlainText] : []
    }),
  ]
    .join(" ")
    .toLowerCase()
}

function scoreItem(item: AgentCatalogItem, normalizedQuery: string) {
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

function countBy<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map()

  for (const item of items) {
    const key = selector(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

function countByMany<T>(items: T[], selector: (item: T) => string[]) {
  const counts = new Map()

  for (const item of items) {
    for (const key of selector(item)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return counts
}
