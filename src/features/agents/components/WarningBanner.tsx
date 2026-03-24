import type { AgentWarning } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"

type WarningBannerProps = {
  warnings: AgentWarning[]
  messages: LocaleMessages
}

export function WarningBanner({ warnings, messages }: WarningBannerProps) {
  if (warnings.length === 0) {
    return null
  }

  return (
    <section className="warning-banner rounded-[1.8rem] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--warning-ink)]">Warning</p>
          <h2 className="mt-2 font-display text-2xl text-[color:var(--ink-strong)]">{messages.warningTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)]">{messages.warningSummary}</p>
        </div>
        <div className="rounded-full border border-[color:var(--warning-border)] px-4 py-2 text-sm font-semibold text-[color:var(--warning-ink)]">
          {warnings.length}
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {warnings.map((warning) => (
          <div
            key={`${warning.code}-${warning.agentId}-${warning.language ?? "all"}`}
            className="rounded-[1.1rem] border border-[color:var(--warning-border)]/60 bg-white/45 px-4 py-3 text-sm leading-6 text-[color:var(--ink-soft)]"
          >
            <strong className="text-[color:var(--ink-strong)]">{warning.agentId}</strong>
            <span className="mx-2 text-[color:var(--muted-ink)]">/</span>
            <span>{warning.language ?? "n/a"}</span>
            <p className="mt-1">{warning.message}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
