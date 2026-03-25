export type LocaleMessages = {
  brandEyebrow: string
  heroTitle: string
  heroSummary: string
  heroMetricAgents: string
  heroMetricLanguages: string
  localeLabel: string
  localeEnglish: string
  localeChinese: string
  syncFresh: string
  syncWatch: string
  syncStale: string
  sourcePanelTitle: string
  sourceCoverage: string
  sourceLastSync: string
  sourceTracked: string
  sourceBrowse: string
  sourceLanguages: string
  filtersTitle: string
  searchLabel: string
  searchPlaceholder: string
  resetFilters: string
  sourceFilter: string
  contentLanguageFilter: string
  typeFilter: string
  allSources: string
  allLanguages: string
  allTypes: string
  resultCount_one: string
  resultCount_other: string
  catalogTitle: string
  openDetail: string
  activeCard: string
  emptyTitle: string
  emptySummary: string
  clearFilters: string
  detailTitle: string
  detailSummary: string
  detailNotFoundTitle: string
  detailNotFoundSummary: string
  fallbackNotice: string
  canonicalId: string
  sourceRepo: string
  sourceType: string
  availableLanguages: string
  tools: string
  model: string
  tags: string
  openSource: string
  copyLink: string
  copied: string
  copyFailed: string
  closeDetail: string
  mobileDetail: string
  languageSwitch: string
  typeReviewer: string
  typeBuildResolver: string
}

export const enMessages: LocaleMessages = {
  brandEyebrow: "HagiCode / Trait Aggregator",
  heroTitle: "Discover reusable agents from audited source repositories.",
  heroSummary:
    "Search prompt-ready reviewers and build resolvers, inspect language coverage, and keep source traceability visible before you copy anything.",
  heroMetricAgents: "Agents indexed",
  heroMetricLanguages: "Languages tracked",
  localeLabel: "UI locale",
  localeEnglish: "EN",
  localeChinese: "中文",
  syncFresh: "Fresh sync",
  syncWatch: "Watch freshness",
  syncStale: "Stale snapshot",
  sourcePanelTitle: "Source intelligence",
  sourceCoverage: "Coverage",
  sourceLastSync: "Last synced",
  sourceTracked: "Tracked entries",
  sourceBrowse: "Open source repo",
  sourceLanguages: "Languages",
  filtersTitle: "Search and facet filters",
  searchLabel: "Search agents",
  searchPlaceholder: "Type reviewer, build, kotlin, security, gradle...",
  resetFilters: "Reset filters",
  sourceFilter: "Source",
  contentLanguageFilter: "Content language",
  typeFilter: "Type",
  allSources: "All sources",
  allLanguages: "All languages",
  allTypes: "All types",
  resultCount_one: "1 result",
  resultCount_other: "{{count}} results",
  catalogTitle: "Agent catalog",
  openDetail: "Open detail",
  activeCard: "Selected",
  emptyTitle: "No agents match the current filters.",
  emptySummary: "Adjust search terms or clear one facet to reopen the catalog.",
  clearFilters: "Clear filters",
  detailTitle: "Agent detail",
  detailSummary: "Canonical metadata, language variants, and readable body stay in one surface.",
  detailNotFoundTitle: "This deep link no longer resolves to a tracked agent.",
  detailNotFoundSummary: "Return to the catalog or open a different entry from the current results.",
  fallbackNotice: "Requested variant unavailable. Showing {{language}} instead.",
  canonicalId: "Canonical ID",
  sourceRepo: "Source repo",
  sourceType: "Source type",
  availableLanguages: "Available languages",
  tools: "Tools",
  model: "Model",
  tags: "Tags",
  openSource: "Open source",
  copyLink: "Copy link",
  copied: "Copied",
  copyFailed: "Copy failed",
  closeDetail: "Close detail",
  mobileDetail: "Mobile detail view",
  languageSwitch: "Variant language",
  typeReviewer: "Reviewer",
  typeBuildResolver: "Build resolver",
}
