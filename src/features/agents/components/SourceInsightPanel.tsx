import type { SourceMeta, UiLocale } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"

export type SourceInsight = SourceMeta & {
  freshness: "fresh" | "watch" | "stale"
}

type SourceInsightPanelProps = {
  sources: SourceInsight[]
  locale: UiLocale
  messages: LocaleMessages
}

export function SourceInsightPanel({ sources, locale, messages }: SourceInsightPanelProps) {
  const totalTracked = sources.reduce((sum, source) => sum + source.trackedAgents, 0)
  const totalSynced = sources.reduce((sum, source) => sum + source.syncedAgents, 0)

  return (
    <section
      className="source-summary-panel rounded-[1.65rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4 shadow-[var(--shadow-soft)] sm:p-5"
      data-testid="source-summary-strip"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">Trace</p>
          <h2 className="mt-2 font-display text-[2.1rem] leading-none text-[color:var(--ink-strong)]">{messages.sourcePanelTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
            {messages.sourceTracked}: {totalSynced}/{totalTracked}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-[color:var(--muted-ink)]">
          <span className="status-pill">{sources.length}</span>
          <span className="rounded-full border border-[color:var(--line-soft)] bg-white/70 px-3 py-2 font-semibold text-[color:var(--ink-strong)]">
            {messages.sourceCoverage}: {totalSynced}/{totalTracked}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {sources.map((source) => (
          <article
            key={source.id}
            className="source-summary-card rounded-[1.2rem] border border-[color:var(--line-soft)] bg-white/72 p-4"
            data-source-summary-card
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-[1.5rem] leading-none text-[color:var(--ink-strong)]">{source.label}</h3>
                <p className="mt-1 truncate text-sm text-[color:var(--ink-soft)]">{source.repo}</p>
              </div>
              <span className="status-pill">{getFreshnessLabel(source.freshness, messages)}</span>
            </div>

            <dl className="mt-4 grid gap-2 text-sm text-[color:var(--ink-soft)]">
              <MetricRow label={messages.sourceCoverage} value={`${source.syncedAgents}/${source.trackedAgents}`} />
              <MetricRow label={messages.sourceLanguages} value={source.languages.join(" · ")} />
              <MetricRow
                label={messages.sourceLastSync}
                value={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(source.lastSyncedAt))}
              />
            </dl>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--line-soft)]/70 pt-3">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">{source.freshness}</span>
              <a className="secondary-link" href={source.homepageUrl} target="_blank" rel="noreferrer">
                {messages.sourceBrowse}
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function getFreshnessLabel(freshness: SourceInsight["freshness"], messages: LocaleMessages) {
  if (freshness === "watch") {
    return messages.syncWatch
  }

  if (freshness === "stale") {
    return messages.syncStale
  }

  return messages.syncFresh
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[color:var(--line-soft)]/70 pb-2 last:border-b-0 last:pb-0">
      <dt className="max-w-[42%] text-[color:var(--muted-ink)]">{label}</dt>
      <dd className="text-right font-semibold text-[color:var(--ink-strong)]">{value}</dd>
    </div>
  )
}
