// Runtime-safe constants and shared types. This module must never import the
// generated catalog or the catalog loader: browser islands import it, and the
// catalog must stay out of their chunks (see src/lib/import-boundary.test.ts).

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

// Route-scoped payloads. Built at build time from the snapshot (src/lib/catalog-loader.ts)
// and passed to islands as props, or written to static JSON under dist/data/.

/** Catalog-wide lists and counts that URL validation and filter toolbars need. */
export type CatalogMeta = {
  totalAgents: number
  totalLanguages: number
  totalTypes: number
  sources: SourceMeta[]
  contentLanguages: ContentLanguage[]
  agentTypes: AgentType[]
  sourceCounts: Record<string, number>
  languageCounts: Record<ContentLanguage, number>
  typeCounts: Record<AgentType, number>
}

/** An agent without its variant collection: enough to render a card and apply every filter. */
export type CatalogListItem = Omit<AgentCatalogItem, "variants">

/** A variant without `bodyPlainText`, which only search needs. */
export type AgentDetailVariant = Omit<AgentVariant, "bodyPlainText">

/**
 * The entry a detail page or the listing drawer renders. A detail page's own payload holds only its
 * language's variant; the per-entry JSON holds every variant.
 */
export type AgentDetailItem = Omit<AgentCatalogItem, "variants"> & {
  variants: Partial<Record<ContentLanguage, AgentDetailVariant>>
}

export type AgentDetailPayload = {
  item: AgentDetailItem
  source: SourceMeta | null
}

/** The one variant a card shows for a UI locale, resolved at build time. */
export type FeaturedCard = {
  agentId: string
  defaultLanguage: ContentLanguage
  availableLanguages: ContentLanguage[]
  language: ContentLanguage
  sourceLabel: string
  type: AgentType
  title: string
  summary: string
}

export type SearchShardDescriptor = {
  language: ContentLanguage
  url: string
  entryCount: number
}
