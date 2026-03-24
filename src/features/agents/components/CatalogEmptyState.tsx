import type { LocaleMessages } from "@/i18n/locales/en"

type CatalogEmptyStateProps = {
  messages: LocaleMessages
  onReset: () => void
}

export function CatalogEmptyState({ messages, onReset }: CatalogEmptyStateProps) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-muted)] px-6 py-10 text-center">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">Empty result</p>
      <h3 className="mt-3 font-display text-3xl text-[color:var(--ink-strong)]">{messages.emptyTitle}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[color:var(--ink-soft)]">{messages.emptySummary}</p>
      <button type="button" onClick={onReset} className="primary-button mt-6">
        {messages.clearFilters}
      </button>
    </div>
  )
}
