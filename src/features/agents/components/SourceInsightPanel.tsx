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
  return (
    <aside className="source-panel rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">Index</p>
          <h2 className="mt-2 font-display text-3xl text-[color:var(--ink-strong)]">{messages.sourcePanelTitle}</h2>
        </div>
        <div className="status-pill">{sources.length}</div>
      </div>

      <div className="mt-5 space-y-4">
        {sources.map((source) => (
          <article key={source.id} className="rounded-[1.4rem] border border-[color:var(--line-soft)] bg-white/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-[color:var(--ink-strong)]">{source.label}</h3>
                <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{source.repo}</p>
              </div>
              <span className="status-pill">{source.status === "partial" ? messages.statusPartial : messages.statusFresh}</span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-[color:var(--ink-soft)]">
              <MetricRow label={messages.sourceCoverage} value={`${source.syncedAgents}/${source.trackedAgents}`} />
              <MetricRow label={messages.sourceLanguages} value={source.languages.join(" · ")} />
              <MetricRow label={messages.sourceWarnings} value={String(source.warningCount)} />
              <MetricRow
                label={messages.sourceLastSync}
                value={new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(source.lastSyncedAt))}
              />
            </dl>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">{source.freshness}</span>
              <a className="secondary-link" href={source.homepageUrl} target="_blank" rel="noreferrer">
                {messages.sourceBrowse}
              </a>
            </div>
          </article>
        ))}
      </div>
    </aside>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line-soft)]/70 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[color:var(--muted-ink)]">{label}</dt>
      <dd className="text-right font-semibold text-[color:var(--ink-strong)]">{value}</dd>
    </div>
  )
}
