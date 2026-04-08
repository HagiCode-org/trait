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
  copyLinkState: "idle" | "done" | "failed"
  copyOriginalState: "idle" | "done" | "failed"
  onClose: () => void
  onCopyLink: () => void
  onCopyOriginal: () => void
  onSelectLanguage: (language: ContentLanguage) => void
}

export function AgentDetailPanel({
  detail,
  detailNotFound,
  locale,
  messages,
  mode,
  copyLinkState,
  copyOriginalState,
  onClose,
  onCopyLink,
  onCopyOriginal,
  onSelectLanguage,
}: AgentDetailPanelProps) {
  const isMobile = mode === "mobile"
  const wrapperClassName = isMobile
    ? "mobile-detail-sheet fixed inset-0 z-50 overflow-y-auto bg-[color:var(--surface-base)] px-4 pb-6 pt-4 lg:hidden"
    : "detail-surface detail-drawer-panel flex h-full w-full flex-col overflow-hidden rounded-[2rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)]"

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
        <div className="rounded-[1.75rem] border border-[color:var(--section-border)] bg-[color:var(--section-surface)] px-5 py-5 text-[color:var(--section-text)]">
          <div>
            <p className="font-display text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--section-muted)]">404</p>
            <h2 className="mt-3 font-display text-[2.4rem] leading-[0.94] tracking-[-0.04em] text-[color:var(--section-text)]">
              {messages.detailNotFoundTitle}
            </h2>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">{messages.detailNotFoundSummary}</p>
          <button type="button" className="secondary-button shrink-0" onClick={onClose}>
            {messages.closeDetail}
          </button>
        </div>
      </section>
    )
  }

  if (!detail) {
    return null
  }

  const copyLabel =
    copyLinkState === "done"
      ? messages.copied
      : copyLinkState === "failed"
        ? messages.copyFailed
        : messages.copyLink
  const copyOriginalLabel =
    copyOriginalState === "done"
      ? messages.copied
      : copyOriginalState === "failed"
        ? messages.copyFailed
        : messages.copyOriginal
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
      <div className="border-b border-[color:var(--section-border)] bg-[color:var(--section-surface)] px-5 pb-5 pt-5 text-[color:var(--section-text)] sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--section-muted)]">{detail.item.sourceLabel}</p>
            <h2 className="mt-3 font-display text-[2.4rem] leading-[0.94] tracking-[-0.05em] text-[color:var(--section-text)]">
              {detail.item.name}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:var(--section-muted)]">{detail.item.summary}</p>
          </div>
          <button type="button" className="ghost-button shrink-0" onClick={onClose}>
            {messages.closeDetail}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" aria-label={messages.languageSwitch}>
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
                className={["ghost-button !min-h-0 !px-3 !py-2 !text-xs", detail.activeLanguage === language ? "!text-[color:var(--contrast-pill-active-text)]" : ""].join(" ")}
                style={
                  detail.activeLanguage === language
                    ? {
                        backgroundColor: "var(--contrast-pill-active-bg)",
                        borderColor: "var(--contrast-pill-active-border)",
                      }
                    : undefined
                }
              >
                {language}
              </a>
            )
          })}
        </div>
      </div>

      <div className="overflow-y-auto px-5 pb-6 pt-5 sm:px-6">
        {detail.fallbackLanguage ? (
          <div className="rounded-[1.25rem] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3 text-sm text-[color:var(--warning-ink)]">
            {formatMessage(messages.fallbackNotice, { language: detail.activeLanguage })}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <MetaCard label={messages.canonicalId} value={detail.item.agentId} />
          <MetaCard label={messages.typeFilter} value={typeLabel} />
          <MetaCard label={messages.sourceRepo} value={detail.item.sourceRepo} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a className="primary-button" href={detail.activeVariant.sourceUrl} target="_blank" rel="noreferrer">
            {messages.openSource}
          </a>
          <button type="button" data-copy-action="link" className="secondary-button" onClick={onCopyLink}>
            {copyLabel}
          </button>
          <button type="button" data-copy-action="raw" className="secondary-button" onClick={onCopyOriginal}>
            {copyOriginalLabel}
          </button>
          <a className="secondary-link" href={buildAgentLanguagePath(detail.item, detail.activeLanguage)}>
            {messages.viewCanonicalPage}
          </a>
          <span className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] px-3 py-2 font-display text-[0.74rem] font-medium uppercase tracking-[0.12em] text-[color:var(--ink-soft)]">
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

        <div className="mt-5 rounded-[1.6rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-4 sm:p-5">
          <MarkdownArticle body={detail.activeVariant.body} />
        </div>
      </div>
    </section>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] px-4 py-3">
      <p className="font-display text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-ink)]">{label}</p>
      <p className="mt-2 text-sm leading-7 text-[color:var(--ink-strong)]">{value}</p>
    </div>
  )
}
