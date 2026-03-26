import { useEffect, useState } from "react"

import type { AgentCatalogItem, SourceMeta, UiLocale } from "@/data/trait-catalog"
import { SiteFooter } from "@/components/site/SiteFooter"
import { SiteHeader } from "@/components/site/SiteHeader"
import { useLocale } from "@/i18n/use-locale"
import { chunkFeaturedItems, type FeaturedItemsByLocale } from "@/lib/featured-selection"
import { buildAgentLanguagePath, humanizeCatalogValue } from "@/lib/route-projection"
import { useAnalyticsBootstrap } from "@/lib/use-analytics"

type HomePageShellProps = {
  featuredItemsByLocale: FeaturedItemsByLocale
  sources: SourceMeta[]
  metrics: {
    totalAgents: number
    totalLanguages: number
    totalSources: number
    totalTypes: number
  }
  initialLocale?: UiLocale
}

export function HomePageShell({ featuredItemsByLocale, sources, metrics, initialLocale = "en" }: HomePageShellProps) {
  const { locale, messages, setLocale } = useLocale(initialLocale)
  const activeFeaturedItems = featuredItemsByLocale[locale] ?? featuredItemsByLocale[initialLocale] ?? []
  const featuredSlides = chunkFeaturedItems(activeFeaturedItems)
  const [activeSlide, setActiveSlide] = useState(0)

  useAnalyticsBootstrap()

  useEffect(() => {
    setActiveSlide(0)
  }, [locale, activeFeaturedItems.length])

  useEffect(() => {
    if (featuredSlides.length <= 1) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % featuredSlides.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [featuredSlides.length])

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface-base)] text-[color:var(--ink-strong)]">
      <div className="background-wash pointer-events-none fixed inset-0" />
      <div className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <SiteHeader locale={locale} messages={messages} onLocaleChange={setLocale} />
      </div>

      <main className="relative mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
        <section className="workbench-shell rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[var(--shadow-soft)] sm:p-8 lg:p-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">{messages.homeEyebrow}</p>
          <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-end">
            <div>
              <h1 className="max-w-4xl font-display text-[3rem] leading-[0.92] text-[color:var(--ink-strong)] sm:text-[4rem]">
                {messages.homeTitle}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[color:var(--ink-soft)]">{messages.homeSummary}</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a className="secondary-link" href="https://hagicode.com/" target="_blank" rel="noreferrer">
                  {messages.homeSecondaryCta}
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <MetricCard label={messages.homeMetricAgents} value={String(metrics.totalAgents)} />
              <MetricCard label={messages.homeMetricLanguages} value={String(metrics.totalLanguages)} />
              <MetricCard label={messages.homeMetricSources} value={String(metrics.totalSources)} />
              <MetricCard label={messages.homeMetricTypes} value={String(metrics.totalTypes)} />
            </div>
          </div>
        </section>

        <a
          data-testid="home-gallery-banner"
          className="gallery-spotlight-card group relative block overflow-hidden rounded-[1.9rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-5 py-8 text-center shadow-[var(--shadow-lift)] transition duration-300 hover:-translate-y-1 hover:border-[color:var(--accent-strong)]/30 hover:shadow-[0_32px_68px_rgba(44,29,20,0.18)] focus-visible:-translate-y-1 focus-visible:border-[color:var(--accent-strong)]/30 focus-visible:outline-none sm:px-8 sm:py-10 lg:px-12 lg:py-12"
          href="/agents/"
        >
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center">
            <p className="gallery-spotlight-chip text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--accent-strong)]">
              {messages.homeGalleryEyebrow}
            </p>
            <h2 className="mt-4 font-display text-[2.65rem] leading-[0.9] text-[color:var(--ink-strong)] sm:text-[3.2rem]">
              {messages.homeFeaturedTitle}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-[0.96rem]">
              {messages.homeFeaturedSummary}
            </p>
            <span className="gallery-spotlight-cta mt-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--accent-strong)]/18 bg-white/84 px-5 py-3 text-sm font-semibold text-[color:var(--ink-strong)]">
              {messages.homePrimaryCta}
              <span aria-hidden="true" className="gallery-spotlight-arrow text-[color:var(--accent-strong)]">
                -&gt;
              </span>
            </span>
          </div>
        </a>

        <section
          data-testid="home-gallery-grid"
          className="rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:p-7"
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {featuredSlides.map((slideItems, slideIndex) => (
                <div key={`${locale}-${slideIndex}`} className="min-w-full">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {slideItems.map((item) => {
                      const activeVariant = pickFeaturedVariant(item, locale)

                      return (
                        <article key={`${locale}-${item.agentId}`}>
                          <a
                            className="catalog-card group flex h-full flex-col rounded-[1.45rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:shadow-[var(--shadow-soft)]"
                            href={buildAgentLanguagePath(item, activeVariant.language)}
                          >
                            <p className="text-[0.64rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{item.sourceLabel}</p>
                            <h3 className="mt-2 font-display text-[1.75rem] leading-[1.02] text-[color:var(--ink-strong)]">{activeVariant.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">{activeVariant.summary}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.availableLanguages.map((language) => (
                                <span key={language} className="tag-chip">
                                  {language}
                                </span>
                              ))}
                            </div>
                            <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color:var(--line-soft)]/80 pt-3 text-[0.78rem] text-[color:var(--muted-ink)]">
                              <span>{humanizeCatalogValue(item.type)}</span>
                              <span
                                aria-hidden="true"
                                className="font-semibold text-[color:var(--accent-strong)] transition-transform duration-200 group-hover:translate-x-1"
                              >
                                -&gt;
                              </span>
                            </div>
                          </a>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {featuredSlides.length > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-2">
              {featuredSlides.map((_, index) => (
                <button
                  key={`${locale}-slide-${index}`}
                  type="button"
                  aria-label={`slide ${index + 1}`}
                  aria-pressed={index === activeSlide}
                  className={[
                    "h-2.5 rounded-full transition-all duration-300",
                    index === activeSlide ? "w-8 bg-[color:var(--accent-strong)]" : "w-2.5 bg-[color:var(--line-strong)]/30",
                  ].join(" ")}
                  onClick={() => setActiveSlide(index)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-5 shadow-[var(--shadow-soft)] sm:p-6 lg:p-7">
          <div className="flex flex-col gap-2 border-b border-[color:var(--line-soft)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{messages.homeMetricSources}</p>
              <h2 className="mt-2 font-display text-[2.2rem] leading-none text-[color:var(--ink-strong)]">{messages.homeSourcesTitle}</h2>
            </div>
            <span className="status-pill">{`${sources.length} ${messages.homeMetricSources}`}</span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {sources.map((source) => {
              const metadataChips = [source.sourceKind, source.layoutType].filter(Boolean)
              const pathSummary = Array.isArray(source.pathPatterns) ? source.pathPatterns.join(" · ") : ""

              return (
                <article key={source.id} className="rounded-[1.35rem] border border-[color:var(--line-soft)] bg-white/72 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-[1.6rem] leading-none text-[color:var(--ink-strong)]">{source.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{source.repo}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {metadataChips.map((value) => (
                          <span key={value} className="tag-chip">
                            {humanizeCatalogValue(value)}
                          </span>
                        ))}
                        {source.warningCount > 0 ? <span className="tag-chip">{`! ${source.warningCount}`}</span> : null}
                      </div>
                      {pathSummary ? <p className="mt-3 text-xs leading-6 text-[color:var(--muted-ink)]">{pathSummary}</p> : null}
                    </div>
                    <a className="secondary-link" href={source.homepageUrl} target="_blank" rel="noreferrer">
                      {messages.openSource}
                    </a>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label={messages.homeMetricAgents} value={formatMetricValue(source.syncedAgents, locale)} compact />
                    <MetricCard label={messages.homeMetricLanguages} value={formatMetricValue(source.languages.length, locale)} compact />
                    <MetricCard label={messages.sourceStars} value={formatMetricValue(source.stargazerCount, locale)} compact />
                    <MetricCard label={messages.sourceLastSync} value={new Date(source.lastSyncedAt).toLocaleDateString(locale)} compact />
                  </div>
                  {source.warningCount > 0 ? (
                    <p className="mt-3 text-xs leading-6 text-[color:var(--muted-ink)]">{source.warnings[0]}</p>
                  ) : (
                    <p className="mt-3 text-xs leading-6 text-[color:var(--muted-ink)]">{`${source.syncedAgents}/${source.trackedAgents}`}</p>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      </main>

      <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-6 sm:px-6 lg:px-8">
        <SiteFooter messages={messages} />
      </div>
    </div>
  )
}

function formatMetricValue(value: number | null, locale: UiLocale) {
  if (typeof value !== "number") {
    return "-"
  }

  return new Intl.NumberFormat(locale).format(value)
}

function pickFeaturedVariant(item: AgentCatalogItem, locale: UiLocale) {
  const requestedLanguage = locale === "zh-CN" ? "zh-CN" : "en"
  return item.variants[requestedLanguage] ?? item.variants[item.defaultLanguage] ?? item.variants[item.availableLanguages[0]]
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={["metric-chip rounded-[1.2rem] border border-[color:var(--line-soft)] bg-white/72", compact ? "px-4 py-3" : "px-5 py-4"].join(" ")}>
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">{label}</p>
      <p className={["font-display text-[color:var(--ink-strong)]", compact ? "mt-2 text-[1.25rem]" : "mt-3 text-[2.1rem]"].join(" ")}>{value}</p>
    </div>
  )
}
