import type { LocaleMessages } from "@/i18n/locales/en"

type CatalogEmptyStateProps = {
  messages: LocaleMessages
  onReset: () => void
}

export function CatalogEmptyState({ messages, onReset }: CatalogEmptyStateProps) {
  return (
    <div
      className="rounded-[2rem] border border-dashed border-[color:var(--line-strong)] bg-[color:var(--surface-muted)] px-5 py-7 sm:px-6"
      data-testid="catalog-empty-state"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="font-display text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-ink)]">Empty result</p>
          <h3 className="mt-3 font-display text-[2.6rem] leading-[0.94] tracking-[-0.04em] text-[color:var(--ink-strong)]">{messages.emptyTitle}</h3>
          <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">{messages.emptySummary}</p>
        </div>

        <button type="button" onClick={onReset} className="primary-button shrink-0">
          {messages.clearFilters}
        </button>
      </div>
    </div>
  )
}
