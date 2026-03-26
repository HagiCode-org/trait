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
  headerBrandBadge: string
  headerDescription: string
  headerNavAria: string
  siteLinksDocs: string
  siteLinksDocsAria: string
  siteLinksWebsite: string
  siteLinksWebsiteAria: string
  siteLinksSoul: string
  siteLinksSoulAria: string
  siteLinksGithub: string
  siteLinksGithubAria: string
  siteLinksDiscord: string
  siteLinksDiscordAria: string
  siteLinksQQGroup: string
  siteLinksQQGroupAria: string
  siteLinksEmail: string
  siteLinksEmailAria: string
  footerDescription: string
  footerCopyright: string
  footerBrandSectionAria: string
  footerSectionRelated: string
  footerSectionCommunity: string
  siteLinksIcpAria: string
  siteLinksPublicSecurityAria: string
  typeReviewer: string
  typeBuildResolver: string
}

export const enMessages: LocaleMessages = {
  brandEyebrow: "HagiCode / Trait Aggregator",
  heroTitle: "Search audited agents before you open a full detail surface.",
  heroSummary:
    "Keep the first viewport focused on query, facets, result count, and catalog scan speed, then inspect source context inside each agent detail.",
  heroMetricAgents: "Agents indexed",
  heroMetricLanguages: "Languages tracked",
  localeLabel: "UI locale",
  localeEnglish: "EN",
  localeChinese: "中文",
  syncFresh: "Fresh sync",
  syncWatch: "Watch freshness",
  syncStale: "Stale snapshot",
  sourcePanelTitle: "Source summary",
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
  emptySummary: "Change the query or clear one facet and the catalog returns immediately.",
  clearFilters: "Clear filters",
  detailTitle: "Agent detail",
  detailSummary: "Detail opens on demand so the catalog stays available for comparison.",
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
  headerBrandBadge: "TRAIT AGGREGATOR",
  headerDescription: "Search and browse audited agent catalogs for the HagiCode platform.",
  headerNavAria: "Main navigation",
  siteLinksDocs: "Docs",
  siteLinksDocsAria: "Open HagiCode documentation",
  siteLinksWebsite: "Website",
  siteLinksWebsiteAria: "Open HagiCode website",
  siteLinksSoul: "Soul",
  siteLinksSoulAria: "Open HagiSoul builder",
  siteLinksGithub: "GitHub",
  siteLinksGithubAria: "Open HagiCode GitHub organization",
  siteLinksDiscord: "Discord",
  siteLinksDiscordAria: "Join HagiCode Discord community",
  siteLinksQQGroup: "QQ Group",
  siteLinksQQGroupAria: "Join HagiCode QQ group",
  siteLinksEmail: "Email",
  siteLinksEmailAria: "Send email to HagiCode support",
  footerDescription:
    "HagiTrait is a searchable workspace for browsing audited agent catalogs, source summaries, and contextual detail views within the HagiCode ecosystem.",
  footerCopyright: "\u00A9 {{year}} HagiCode. All rights reserved.",
  footerBrandSectionAria: "Brand information",
  footerSectionRelated: "Related",
  footerSectionCommunity: "Community",
  siteLinksIcpAria: "ICP filing information",
  siteLinksPublicSecurityAria: "Public security filing information",
}
