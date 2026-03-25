import type { ContentLanguage, UiLocale } from "@/data/trait-catalog"
import { humanizeCatalogValue, type AgentDetailView } from "@/lib/trait-builder"
import type { LocaleMessages } from "@/i18n/locales/en"
import { formatMessage } from "@/i18n/use-locale"

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
  const wrapperClassName =
    mode === "mobile"
      ? "mobile-detail-sheet fixed inset-0 z-50 overflow-y-auto bg-[color:var(--surface-base)] px-4 pb-6 pt-4 lg:hidden"
      : "detail-surface rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"

  if (detailNotFound && !detail) {
    return (
      <section className={wrapperClassName} aria-label={messages.mobileDetail}>
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line-soft)] pb-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">404</p>
            <h2 className="mt-2 font-display text-2xl text-[color:var(--ink-strong)]">{messages.detailNotFoundTitle}</h2>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            {messages.closeDetail}
          </button>
        </div>
        <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">{messages.detailNotFoundSummary}</p>
      </section>
    )
  }

  if (!detail) {
    return (
      <section className={wrapperClassName}>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">Surface</p>
        <h2 className="mt-2 font-display text-3xl text-[color:var(--ink-strong)]">{messages.detailTitle}</h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">{messages.detailSummary}</p>
      </section>
    )
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
    <section className={wrapperClassName} aria-label={mode === "mobile" ? messages.mobileDetail : messages.detailTitle}>
      <div className="flex flex-col gap-4 border-b border-[color:var(--line-soft)] pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">{detail.item.sourceLabel}</p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-[color:var(--ink-strong)]">{detail.item.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)]">{detail.item.summary}</p>
          </div>
          {mode === "mobile" ? (
            <button type="button" className="secondary-button" onClick={onClose}>
              {messages.closeDetail}
            </button>
          ) : null}
        </div>

        {detail.fallbackLanguage ? (
          <div className="rounded-[1rem] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3 text-sm text-[color:var(--warning-ink)]">
            {formatMessage(messages.fallbackNotice, { language: detail.activeLanguage })}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2" aria-label={messages.languageSwitch}>
          {detail.item.availableLanguages.map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => onSelectLanguage(language)}
              className={["filter-pill", detail.activeLanguage === language ? "is-active" : ""].join(" ")}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <MetaCard label={messages.canonicalId} value={detail.item.agentId} />
        <MetaCard label={messages.typeFilter} value={typeLabel} />
        <MetaCard label={messages.sourceRepo} value={detail.item.sourceRepo} />
        <MetaCard label={messages.sourceType} value={detail.item.sourceType} />
        <MetaCard label={messages.model} value={detail.item.model ?? "n/a"} />
        <MetaCard label={messages.availableLanguages} value={detail.item.availableLanguages.join(" · ")} />
        <MetaCard label={messages.tools} value={detail.item.tools.join(" · ")} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {detail.item.tags.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a className="primary-button" href={detail.activeVariant.sourceUrl} target="_blank" rel="noreferrer">
          {messages.openSource}
        </a>
        <button type="button" className="secondary-button" onClick={onCopyLink}>
          {copyLabel}
        </button>
        <span className="self-center text-sm text-[color:var(--muted-ink)]">
          {lastSyncedLabel}
        </span>
      </div>

      <div className="mt-8 rounded-[1.6rem] border border-[color:var(--line-soft)] bg-white/50 p-5">
        <MarkdownArticle body={detail.activeVariant.body} />
      </div>
    </section>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[color:var(--line-soft)] bg-white/60 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-ink)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-strong)]">{value}</p>
    </div>
  )
}
