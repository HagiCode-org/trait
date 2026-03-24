import snapshotData from "@/data/generated/agent-catalog.json"

export const contentLanguages = ["en", "zh-CN", "tr"] as const
export const uiLocales = ["en", "zh-CN"] as const
export const agentTypes = ["reviewer", "build-resolver"] as const

export type ContentLanguage = (typeof contentLanguages)[number]
export type UiLocale = (typeof uiLocales)[number]
export type AgentType = (typeof agentTypes)[number]
export type FilterValue<T extends string> = T | "all"

export type AgentWarning = {
  code: string
  agentId?: string
  language?: string
  sourceId?: string
  sourcePath?: string
  message: string
}

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
  warnings: AgentWarning[]
  variants: Partial<Record<ContentLanguage, AgentVariant>>
}

export type SourceMeta = {
  id: string
  label: string
  repo: string
  branch: string
  homepageUrl: string
  sourceType: string
  status: "fresh" | "partial"
  trackedAgents: number
  syncedAgents: number
  languages: ContentLanguage[]
  warningCount: number
  lastSyncedAt: string
}

export type LanguageIndex = Partial<Record<ContentLanguage, string[]>>

export type AgentCatalogSnapshot = {
  version: number
  lastSyncedAt: string
  warnings: AgentWarning[]
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

export function isContentLanguage(value: string | null | undefined): value is ContentLanguage {
  return contentLanguages.includes(value as ContentLanguage)
}

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return uiLocales.includes(value as UiLocale)
}

export function isAgentType(value: string | null | undefined): value is AgentType {
  return agentTypes.includes(value as AgentType)
}
