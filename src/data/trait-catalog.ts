import snapshotData from "@/data/generated/agent-catalog.json"

export const uiLocales = ["en", "zh-CN"] as const

export type ContentLanguage = string
export type UiLocale = (typeof uiLocales)[number]
export type AgentType = string
export type FilterValue<T extends string> = T | "all"

export type AgentVariantAttributes = {
  name?: string
  description?: string
  tools?: string[] | string
  model?: string | null
  [key: string]: unknown
}

export type AgentVariant = {
  language: ContentLanguage
  title: string
  summary: string
  body: string
  bodyPlainText: string
  sourcePath: string
  sourceUrl: string
  rawUrl: string
  attributes: AgentVariantAttributes
}

export type AgentCatalogItem = {
  traitCatalogId: string
  agentId: string
  name: string
  summary: string
  type: AgentType
  tags: string[]
  tools: string[]
  model: string | null
  sourceId: string
  sourceLabel: string
  sourceRepo: string
  sourceType: string
  sourceUrl: string
  canonicalPath: string
  defaultLanguage: ContentLanguage
  availableLanguages: ContentLanguage[]
  variants: Record<ContentLanguage, AgentVariant>
}

export type SourceMeta = {
  id: string
  label: string
  repo: string
  branch: string
  homepageUrl: string
  sourceType: string
  trackedAgents: number
  syncedAgents: number
  languages: ContentLanguage[]
  lastSyncedAt: string
}

export type LanguageIndex = Record<ContentLanguage, string[]>

export type AgentCatalogSnapshot = {
  version: number
  lastSyncedAt: string
  languageIndex: LanguageIndex
  sources: SourceMeta[]
  items: AgentCatalogItem[]
}

export type FilterState = {
  query: string
  sourceId: FilterValue<string>
  contentLanguage: FilterValue<ContentLanguage>
  agentType: FilterValue<AgentType>
}

export type DetailRouteState = {
  agentId: string | null
  language: ContentLanguage | null
}

export type RouteState = {
  filters: FilterState
  detail: DetailRouteState
}

export const defaultFilterState: FilterState = {
  query: "",
  sourceId: "all",
  contentLanguage: "all",
  agentType: "all",
}

export const emptyDetailRouteState: DetailRouteState = {
  agentId: null,
  language: null,
}

export const agentCatalogSnapshot = snapshotData as AgentCatalogSnapshot
export const traitCatalog = agentCatalogSnapshot.items
export const sourceCatalog = agentCatalogSnapshot.sources
export const contentLanguages = Object.keys(agentCatalogSnapshot.languageIndex).sort((left, right) => left.localeCompare(right))
export const agentTypes = Array.from(new Set(agentCatalogSnapshot.items.map((item) => item.type))).sort((left, right) =>
  left.localeCompare(right)
)

export function isContentLanguage(value: string | null | undefined): value is ContentLanguage {
  return typeof value === "string" && contentLanguages.includes(value)
}

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return uiLocales.includes(value as UiLocale)
}

export function isAgentType(value: string | null | undefined): value is AgentType {
  return typeof value === "string" && agentTypes.includes(value)
}
