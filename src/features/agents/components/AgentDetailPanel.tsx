import type { ContentLanguage, UiLocale } from "@/data/trait-catalog"
import { formatMessage } from "@/i18n/use-locale"
import type { LocaleMessages } from "@/i18n/locales/en"
import { buildAgentLanguagePath, humanizeCatalogValue, type AgentDetailView } from "@/lib/route-projection"

import { MarkdownArticle } from "./MarkdownArticle"

type AgentDetailPanelProps = {
  detail: AgentDetailView | null
  detailNotFound: boolean
  locale: UiLocale
  messages: LocaleMessages
  mode: "desktop" | "mobile"
  copyState: "idle" | "done" | "failed"
  onClose: () => void
  onCopyLink: () => void
  onSelectLanguage: (language: ContentLanguage) => void
}

export function AgentDetailPanel({
  detail,
  detailNotFound,
  locale,
  messages,
  mode,
  copyState,
  onClose,
  onCopyLink,
  onSelectLanguage,
}: AgentDetailPanelProps) {
  const isMobile = mode === "mobile"
  const wrapperClassName = isMobile
    ? "mobile-detail-sheet fixed inset-0 z-50 overflow-y-auto bg-[color:var(--surface-base)]/96 px-4 pb-6 pt-4 lg:hidden"
    : "detail-surface detail-drawer-panel flex h-full w-full flex-col overflow-hidden rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] shadow-[var(--shadow-lift)]"

  if (detailNotFound && !detail) {
    return (
      <section
        className={wrapperClassName}
        data-panel-mode={mode}
        data-testid={`${mode}-detail-panel`}
        role="dialog"
        aria-label={isMobile ? messages.mobileDetail : messages.detailTitle}
        aria-modal={isMobile || undefined}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line-soft)] pb-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">404</p>
            <h2 className="mt-2 font-display text-[2rem] leading-none text-[color:var(--ink-strong)]">{messages.detailNotFoundTitle}</h2>
          </div>
          <button type="button" className="secondary-button shrink-0" onClick={onClose}>
            {messages.closeDetail}
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-[color:var(--ink-soft)]">{messages.detailNotFoundSummary}</p>
      </section>
    )
  }

  if (!detail) {
    return null
  }

  const copyLabel =
    copyState === "done"
      ? messages.copied
      : copyState === "failed"
        ? messages.copyFailed
        : messages.copyLink
  const lastSyncedLabel = detail.source
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(detail.source.lastSyncedAt))
    : "n/a"
  const typeLabel =
    detail.item.type === "reviewer"
      ? messages.typeReviewer
      : detail.item.type === "build-resolver"
        ? messages.typeBuildResolver
        : humanizeCatalogValue(detail.item.type)

  return (
    <section
      className={wrapperClassName}
      data-panel-mode={mode}
      data-testid={`${mode}-detail-panel`}
      role="dialog"
      aria-label={isMobile ? messages.mobileDetail : messages.detailTitle}
      aria-modal={isMobile || undefined}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--line-soft)] px-5 pb-4 pt-5 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{detail.item.sourceLabel}</p>
          <h2 className="mt-2 font-display text-[2.15rem] leading-[0.96] text-[color:var(--ink-strong)]">{detail.item.name}</h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">{detail.item.summary}</p>
        </div>
        <button type="button" className="secondary-button shrink-0" onClick={onClose}>
          {messages.closeDetail}
        </button>
      </div>

      <div className="overflow-y-auto px-5 pb-6 pt-4 sm:px-6">
        {detail.fallbackLanguage ? (
          <div className="rounded-[1rem] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3 text-sm text-[color:var(--warning-ink)]">
            {formatMessage(messages.fallbackNotice, { language: detail.activeLanguage })}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetaCard label={messages.canonicalId} value={detail.item.agentId} />
          <MetaCard label={messages.typeFilter} value={typeLabel} />
          <MetaCard label={messages.sourceRepo} value={detail.item.sourceRepo} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2" aria-label={messages.languageSwitch}>
          {detail.item.availableLanguages.map((language) => {
            const href = buildAgentLanguagePath(detail.item, language)

            return (
              <a
                key={language}
                href={href}
                data-detail-language={language}
                onClick={(event) => {
                  event.preventDefault()
                  onSelectLanguage(language)
                }}
                className={["filter-pill", detail.activeLanguage === language ? "is-active" : ""].join(" ")}
              >
                {language}
              </a>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a className="primary-button" href={detail.activeVariant.sourceUrl} target="_blank" rel="noreferrer">
            {messages.openSource}
          </a>
          <button type="button" className="secondary-button" onClick={onCopyLink}>
            {copyLabel}
          </button>
          <a className="secondary-link" href={buildAgentLanguagePath(detail.item, detail.activeLanguage)}>
            {messages.viewCanonicalPage}
          </a>
          <span className="rounded-full border border-[color:var(--line-soft)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
            {messages.sourceLastSync}: {lastSyncedLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetaCard label={messages.sourceType} value={detail.item.sourceType} />
          <MetaCard label={messages.model} value={detail.item.model ?? "n/a"} />
          <MetaCard label={messages.availableLanguages} value={detail.item.availableLanguages.join(" · ")} />
          <MetaCard label={messages.tools} value={detail.item.tools.join(" · ")} />
        </div>

        {detail.item.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {detail.item.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 rounded-[1.35rem] border border-[color:var(--line-soft)] bg-white/76 p-4 sm:p-5">
          <MarkdownArticle body={detail.activeVariant.body} />
        </div>
      </div>
    </section>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[color:var(--line-soft)] bg-white/72 px-4 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-strong)]">{value}</p>
    </div>
  )
}
