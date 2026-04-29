import { loadCatalogSnapshot } from "@/lib/catalog-loader"

export const uiLocales = ["en", "zh-CN", "zh-Hant", "ja-JP", "ko-KR", "de-DE", "fr-FR", "es-ES", "pt-BR", "ru-RU"] as const

export type ContentLanguage = string
export type UiLocale = (typeof uiLocales)[number]
export type AgentType = string
export type FilterValue<T extends string> = T | "all"

export const DEFAULT_UI_LOCALE: UiLocale = "en"

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-Hant": "繁體中文",
  "ja-JP": "日本語",
  "ko-KR": "한국어",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "es-ES": "Español",
  "pt-BR": "Português (Brasil)",
  "ru-RU": "Русский",
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
  sourceAgentId: string
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
  cliFamily: string
  sourceKind: string
  layoutType: string
  fileFormat: string
  pathPatterns: string[]
  directCompatible: boolean
  needsRecursiveScan: boolean
  needsCustomParser: boolean
  trackedAgents: number
  syncedAgents: number
  languages: ContentLanguage[]
  stargazerCount: number | null
  stargazerCountLastFetchedAt: string | null
  lastSyncedAt: string
  available: boolean
  warningCount: number
  warnings: string[]
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

export const agentCatalogSnapshot = loadCatalogSnapshot()
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

export function resolveUiLocale(value: string | null | undefined): UiLocale | null {
  if (isUiLocale(value)) {
    return value
  }

  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (normalized.startsWith("zh-hant") || normalized === "zh-tw" || normalized === "zh-hk" || normalized === "zh-mo") {
    return "zh-Hant"
  }

  if (normalized.startsWith("zh")) {
    return "zh-CN"
  }

  if (normalized.startsWith("en")) {
    return "en"
  }

  if (normalized.startsWith("ja")) {
    return "ja-JP"
  }

  if (normalized.startsWith("ko")) {
    return "ko-KR"
  }

  if (normalized.startsWith("de")) {
    return "de-DE"
  }

  if (normalized.startsWith("fr")) {
    return "fr-FR"
  }

  if (normalized.startsWith("es")) {
    return "es-ES"
  }

  if (normalized.startsWith("pt")) {
    return "pt-BR"
  }

  if (normalized.startsWith("ru")) {
    return "ru-RU"
  }

  return null
}

export function isAgentType(value: string | null | undefined): value is AgentType {
  return typeof value === "string" && agentTypes.includes(value)
}
