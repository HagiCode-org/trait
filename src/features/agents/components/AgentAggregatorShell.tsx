import { buildDetailLink, getSourceMetrics, type AgentDetailView, type CatalogFilterOptions } from "@/lib/trait-builder"
import type {
  AgentCatalogItem,
  AgentCatalogSnapshot,
  ContentLanguage,
  FilterState,
  RouteState,
  UiLocale,
} from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"
import { formatMessage } from "@/i18n/use-locale"

import { AgentCard } from "./AgentCard"
import { AgentDetailPanel } from "./AgentDetailPanel"
import { CatalogEmptyState } from "./CatalogEmptyState"
import { SourceInsightPanel } from "./SourceInsightPanel"
import { WarningBanner } from "./WarningBanner"

type AgentAggregatorShellProps = {
  snapshot: AgentCatalogSnapshot
  locale: UiLocale
  messages: LocaleMessages
  routeState: RouteState
  filterState: FilterState
  filterOptions: CatalogFilterOptions
  results: AgentCatalogItem[]
  detail: AgentDetailView | null
  detailNotFound: boolean
  copyState: "idle" | "done" | "failed"
  onLocaleChange: (locale: UiLocale) => void
  onQueryChange: (query: string) => void
  onSourceChange: (value: FilterState["sourceId"]) => void
  onLanguageFilterChange: (value: FilterState["contentLanguage"]) => void
  onTypeChange: (value: FilterState["agentType"]) => void
  onResetFilters: () => void
  onOpenAgent: (agentId: string, language: ContentLanguage | null) => void
  onCloseDetail: () => void
  onSelectDetailLanguage: (language: ContentLanguage) => void
  onCopyLink: () => void
}

export function AgentAggregatorShell({
  snapshot,
  locale,
  messages,
  routeState,
  filterState,
  filterOptions,
  results,
  detail,
  detailNotFound,
  copyState,
  onLocaleChange,
  onQueryChange,
  onSourceChange,
  onLanguageFilterChange,
  onTypeChange,
  onResetFilters,
  onOpenAgent,
  onCloseDetail,
  onSelectDetailLanguage,
  onCopyLink,
}: AgentAggregatorShellProps) {
  const sourceMetrics = getSourceMetrics(snapshot)
  const totalLanguages = Object.keys(snapshot.languageIndex).length
  const resultLabel =
    results.length === 1
      ? messages.resultCount_one
      : formatMessage(messages.resultCount_other, { count: results.length })

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface-base)] text-[color:var(--ink-strong)]">
      <div className="background-wash pointer-events-none fixed inset-0" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <header className="hero-shell rounded-[2.2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.42em] text-[color:var(--muted-ink)]">{messages.brandEyebrow}</p>
              <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.96] text-[color:var(--ink-strong)] sm:text-6xl lg:text-7xl">
                {messages.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">{messages.heroSummary}</p>
            </div>

            <div className="locale-switch rounded-[1.6rem] border border-[color:var(--line-soft)] bg-white/55 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{messages.localeLabel}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" className={["filter-pill", locale === "en" ? "is-active" : ""].join(" ")} onClick={() => onLocaleChange("en")}>
                  {messages.localeEnglish}
                </button>
                <button type="button" className={["filter-pill", locale === "zh-CN" ? "is-active" : ""].join(" ")} onClick={() => onLocaleChange("zh-CN")}>
                  {messages.localeChinese}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetricPanel label={messages.heroMetricAgents} value={String(snapshot.items.length).padStart(2, "0")} />
            <MetricPanel label={messages.heroMetricLanguages} value={String(totalLanguages).padStart(2, "0")} />
            <MetricPanel label={messages.heroMetricWarnings} value={String(snapshot.warnings.length).padStart(2, "0")} />
          </div>
        </header>

        <WarningBanner warnings={snapshot.warnings} messages={messages} />

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SourceInsightPanel sources={sourceMetrics} locale={locale} messages={messages} />

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-5 border-b border-[color:var(--line-soft)] pb-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">Facet</p>
                  <h2 className="mt-2 font-display text-3xl text-[color:var(--ink-strong)]">{messages.filtersTitle}</h2>
                </div>
                <div className="status-pill">{resultLabel}</div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                <label className="search-field flex items-center gap-3 rounded-[1.5rem] border border-[color:var(--line-soft)] bg-white/55 px-4 py-3 focus-within:border-[color:var(--accent-strong)]">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{messages.searchLabel}</span>
                  <input
                    value={filterState.query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={messages.searchPlaceholder}
                    className="w-full bg-transparent text-sm text-[color:var(--ink-strong)] outline-none placeholder:text-[color:var(--muted-ink)]/70"
                  />
                </label>
                <button type="button" className="secondary-button" onClick={onResetFilters}>
                  {messages.resetFilters}
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <FilterGroup
                  label={messages.sourceFilter}
                  options={filterOptions.sources}
                  currentValue={filterState.sourceId}
                  allLabel={messages.allSources}
                  onSelect={(value) => onSourceChange(value as FilterState["sourceId"])}
                />
                <FilterGroup
                  label={messages.contentLanguageFilter}
                  options={filterOptions.languages}
                  currentValue={filterState.contentLanguage}
                  allLabel={messages.allLanguages}
                  onSelect={(value) => onLanguageFilterChange(value as FilterState["contentLanguage"])}
                />
                <FilterGroup
                  label={messages.typeFilter}
                  options={filterOptions.types}
                  currentValue={filterState.agentType}
                  allLabel={messages.allTypes}
                  onSelect={(value) => onTypeChange(value as FilterState["agentType"])}
                  transformLabel={(value) =>
                    value === "reviewer"
                      ? messages.typeReviewer
                      : value === "build-resolver"
                        ? messages.typeBuildResolver
                        : value
                  }
                />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line-soft)] pb-5">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">Catalog</p>
                    <h2 className="mt-2 font-display text-3xl text-[color:var(--ink-strong)]">{messages.catalogTitle}</h2>
                  </div>
                  <span className="text-sm text-[color:var(--muted-ink)]">
                    {routeState.detail.agentId
                      ? buildDetailLink(routeState, routeState.detail.agentId, routeState.detail.language)
                      : resultLabel}
                  </span>
                </div>

                <div className="mt-5">
                  {results.length === 0 ? (
                    <CatalogEmptyState messages={messages} onReset={onResetFilters} />
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {results.map((item) => (
                        <AgentCard
                          key={item.agentId}
                          item={item}
                          isActive={item.agentId === detail?.item.agentId}
                          messages={messages}
                          onOpen={onOpenAgent}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:block">
                <AgentDetailPanel
                  detail={detail}
                  detailNotFound={detailNotFound}
                  locale={locale}
                  messages={messages}
                  mode="desktop"
                  copyState={copyState}
                  onClose={onCloseDetail}
                  onCopyLink={onCopyLink}
                  onSelectLanguage={onSelectDetailLanguage}
                />
              </div>
            </section>
          </div>
        </section>
      </main>

      {detail || detailNotFound ? (
        <AgentDetailPanel
          detail={detail}
          detailNotFound={detailNotFound}
          locale={locale}
          messages={messages}
          mode="mobile"
          copyState={copyState}
          onClose={onCloseDetail}
          onCopyLink={onCopyLink}
          onSelectLanguage={onSelectDetailLanguage}
        />
      ) : null}
    </div>
  )
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-panel rounded-[1.6rem] border border-[color:var(--line-soft)] bg-white/55 p-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">{label}</p>
      <p className="mt-4 font-display text-5xl text-[color:var(--ink-strong)]">{value}</p>
    </div>
  )
}

function FilterGroup<T extends string>({
  label,
  options,
  currentValue,
  allLabel,
  onSelect,
  transformLabel,
}: {
  label: string
  options: Array<{ value: T | "all"; count: number }>
  currentValue: T | "all"
  allLabel: string
  onSelect: (value: T | "all") => void
  transformLabel?: (value: T | "all") => string
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const labelText = option.value === "all" ? allLabel : transformLabel?.(option.value) ?? option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={["filter-pill", currentValue === option.value ? "is-active" : ""].join(" ")}
            >
              {labelText}
              <span className="ml-2 text-[0.72em] opacity-70">{option.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
