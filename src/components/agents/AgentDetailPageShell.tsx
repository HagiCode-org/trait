import { useEffect, useMemo, useState } from "react"

import type { AgentCatalogItem, ContentLanguage, UiLocale } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"
import { formatMessage, useLocale } from "@/i18n/use-locale"
import { SiteFooter } from "@/components/site/SiteFooter"
import { SiteHeader } from "@/components/site/SiteHeader"
import { MarkdownArticle } from "@/features/agents/components/MarkdownArticle"
import { buildAgentLanguagePath, humanizeCatalogValue, pickDetailLanguage, resolveAgentDetail } from "@/lib/route-projection"
import { useAnalyticsBootstrap } from "@/lib/use-analytics"

type AgentDetailPageShellProps = {
  item: AgentCatalogItem
  initialLanguage: ContentLanguage
  initialLocale?: UiLocale
}

const COPY_RESET_MS = 1600

export function AgentDetailPageShell({ item, initialLanguage, initialLocale = "en" }: AgentDetailPageShellProps) {
  const { locale, messages, setLocale } = useLocale(initialLocale)
  const [activeLanguage, setActiveLanguage] = useState<ContentLanguage>(initialLanguage)
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle")

  useAnalyticsBootstrap()

  const detail = useMemo(() => resolveAgentDetail(item.agentId, activeLanguage), [item.agentId, activeLanguage])

  useEffect(() => {
    if (copyState === "idle") {
      return undefined
    }

    const timer = window.setTimeout(() => setCopyState("idle"), COPY_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copyState])

  function handleSelectLanguage(language: ContentLanguage) {
    const nextLanguage = pickDetailLanguage(item, language)
    setActiveLanguage(nextLanguage)

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", buildAgentLanguagePath(item, nextLanguage))
    }
  }

  async function copyCurrentLink() {
    if (typeof window === "undefined") {
      return
    }

    try {
      const href = new URL(buildAgentLanguagePath(item, activeLanguage), window.location.origin).toString()
      await navigator.clipboard.writeText(href)
      setCopyState("done")
    } catch {
      setCopyState("failed")
    }
  }

  if (!detail) {
    return null
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface-base)] text-[color:var(--ink-strong)]">
      <div className="background-wash pointer-events-none fixed inset-0" />
      <div className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <SiteHeader locale={locale} messages={messages} onLocaleChange={setLocale} />
      </div>

      <main className="relative mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6">
        <section className="workbench-shell rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[var(--shadow-soft)] sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">{detail.item.sourceLabel}</p>
              <h1 className="mt-3 font-display text-[2.8rem] leading-[0.92] text-[color:var(--ink-strong)]">{detail.item.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ink-soft)]">{detail.activeVariant.summary}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <a className="secondary-link" href="/agents/">
                {messages.backToCatalog}
              </a>
              <button type="button" className="secondary-button" onClick={copyCurrentLink}>
                {copyState === "done" ? messages.copied : copyState === "failed" ? messages.copyFailed : messages.copyLink}
              </button>
              <a className="primary-button" href={detail.activeVariant.sourceUrl} target="_blank" rel="noreferrer">
                {messages.openSource}
              </a>
            </div>
          </div>

          {detail.fallbackLanguage ? (
            <div className="mt-4 rounded-[1rem] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3 text-sm text-[color:var(--warning-ink)]">
              {formatMessage(messages.fallbackNotice, { language: detail.activeLanguage })}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2" aria-label={messages.languageSwitch}>
            {detail.item.availableLanguages.map((language) => (
              <a
                key={language}
                href={buildAgentLanguagePath(detail.item, language)}
                data-detail-language={language}
                onClick={(event) => {
                  event.preventDefault()
                  handleSelectLanguage(language)
                }}
                className={["filter-pill", activeLanguage === language ? "is-active" : ""].join(" ")}
              >
                {language}
              </a>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaCard label={messages.canonicalId} value={detail.item.agentId} />
            <MetaCard label={messages.typeFilter} value={typeLabel(detail.item, messages)} />
            <MetaCard label={messages.sourceRepo} value={detail.item.sourceRepo} />
            <MetaCard label={messages.shareableLink} value={buildAgentLanguagePath(detail.item, detail.activeLanguage)} />
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 shadow-[var(--shadow-soft)] sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetaCard label={messages.sourceType} value={detail.item.sourceType} />
            <MetaCard label={messages.model} value={detail.item.model ?? "n/a"} />
            <MetaCard label={messages.availableLanguages} value={detail.item.availableLanguages.join(" · ")} />
            <MetaCard label={messages.tools} value={detail.item.tools.join(" · ")} />
          </div>

          {detail.item.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {detail.item.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <article className="mt-6 rounded-[1.35rem] border border-[color:var(--line-soft)] bg-white/76 p-5 sm:p-6">
            <MarkdownArticle body={detail.activeVariant.body} />
          </article>
        </section>
      </main>

      <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-6 sm:px-6 lg:px-8">
        <SiteFooter messages={messages} />
      </div>
    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[color:var(--line-soft)] bg-white/72 px-4 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">{label}</p>
      <p className="mt-2 break-all text-sm leading-6 text-[color:var(--ink-strong)]">{value}</p>
    </div>
  )
}

function typeLabel(item: AgentCatalogItem, messages: LocaleMessages) {
  if (item.type === "reviewer") {
    return messages.typeReviewer
  }

  if (item.type === "build-resolver") {
    return messages.typeBuildResolver
  }

  return humanizeCatalogValue(item.type)
}
