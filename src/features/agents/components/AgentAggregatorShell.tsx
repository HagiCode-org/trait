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
import {
  buildDetailLink,
  humanizeCatalogValue,
  type AgentDetailView,
  type CatalogFilterOptions,
} from "@/lib/route-projection"

import { SiteHeader } from "@/components/site/SiteHeader"
import { SiteFooter } from "@/components/site/SiteFooter"

import { AgentCard } from "./AgentCard"
import { AgentDetailPanel } from "./AgentDetailPanel"
import { CatalogEmptyState } from "./CatalogEmptyState"

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
  const resultLabel =
    results.length === 1
      ? messages.resultCount_one
      : formatMessage(messages.resultCount_other, { count: results.length })
  const detailLink = routeState.detail.agentId
    ? buildDetailLink(routeState, routeState.detail.agentId, routeState.detail.language)
    : null
  const hasContextualDetail = Boolean(detail) || detailNotFound

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface-base)] text-[color:var(--ink-strong)]">
      <div className="background-wash pointer-events-none fixed inset-0" />

      <div className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <SiteHeader locale={locale} messages={messages} onLocaleChange={onLocaleChange} />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
        <header className="workbench-shell rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:p-7">
          <div data-testid="catalog-workbench">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">{messages.filtersTitle}</p>
              <h1 className="mt-3 font-display text-[2.7rem] leading-[0.92] text-[color:var(--ink-strong)]">{messages.catalogTitle}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)]">{messages.catalogIntro}</p>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <label className="search-field flex items-center gap-3 rounded-[1.35rem] border border-[color:var(--line-soft)] bg-white/72 px-4 py-3 focus-within:border-[color:var(--accent-strong)] focus-within:shadow-[var(--shadow-soft)]">
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">{messages.searchLabel}</span>
                <input
                  aria-label={messages.searchLabel}
                  value={filterState.query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder={messages.searchPlaceholder}
                  className="w-full min-w-0 bg-transparent text-sm text-[color:var(--ink-strong)] outline-none placeholder:text-[color:var(--muted-ink)]/70"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className="status-pill" data-testid="result-summary">{resultLabel}</span>
                <button type="button" className="secondary-button" onClick={onResetFilters}>
                  {messages.resetFilters}
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3" data-testid="filter-toolbar">
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
                      : humanizeCatalogValue(value)
                }
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted-ink)]">
              <span className="rounded-full border border-[color:var(--line-soft)] bg-white/66 px-3 py-2 font-semibold text-[color:var(--ink-strong)]">
                {messages.catalogSummary}
              </span>
              {detailLink ? (
                <span className="truncate rounded-full border border-[color:var(--line-soft)] bg-white/50 px-3 py-2 text-[0.78rem] text-[color:var(--ink-soft)]">
                  {detailLink}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <section className="rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)] sm:p-5 lg:p-6">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line-soft)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <span className="text-sm text-[color:var(--muted-ink)]">{detailLink ?? resultLabel}</span>
          </div>

          <div className="mt-4">
            {results.length === 0 ? (
              <CatalogEmptyState messages={messages} onReset={onResetFilters} />
            ) : (
              <div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 [content-visibility:auto]"
                data-testid="catalog-grid"
              >
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
        </section>
      </main>

      <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-6 sm:px-6 lg:px-8">
        <SiteFooter messages={messages} />
      </div>

      {hasContextualDetail ? (
        <>
          <button
            type="button"
            aria-label={messages.closeDetail}
            className="detail-backdrop fixed inset-0 z-30 hidden bg-[color:var(--surface-overlay)] lg:block"
            onClick={onCloseDetail}
          />
          <div className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-full justify-end p-3 lg:flex xl:p-4">
            <div className="pointer-events-auto flex h-full w-[90vw] max-w-[90vw]" data-testid="desktop-detail-layer">
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
          </div>
        </>
      ) : null}

      {hasContextualDetail ? (
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
  transformLabel?: (value: T) => string
}) {
  return (
    <div className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-white/66 p-3">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isAll = option.value === "all"
          const labelText = isAll ? allLabel : transformLabel ? transformLabel(option.value as T) : String(option.value)

          return (
            <button
              key={`${label}-${option.value}`}
              type="button"
              onClick={() => onSelect(option.value)}
              className={["filter-pill", currentValue === option.value ? "is-active" : ""].join(" ")}
            >
              {labelText}
              <span className="ml-2 text-[0.72rem] opacity-80">{option.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
