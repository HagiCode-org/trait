import { useEffect, useMemo, useState } from "react"

import type { AgentDetailItem, AgentDetailPayload, ContentLanguage, UiLocale } from "@/data/ui-constants"
import type { LocaleMessages } from "@/i18n/locales/en"
import { formatMessage, useLocale } from "@/i18n/use-locale"
import { SiteHeader } from "@/components/site/SiteHeader"
import { MarkdownArticle } from "@/features/agents/components/MarkdownArticle"
import { useAgentDetail } from "@/lib/agent-detail-data"
import { buildAgentVariantMarkdown } from "@/lib/agent-markdown"
import { copyText } from "@/lib/clipboard"
import { captureSiteEvent } from "@/lib/posthog-events"
import {
  buildAgentLanguagePath,
  humanizeCatalogValue,
  pickDetailLanguage,
  projectDetailLanguageToUiLocale,
  resolveAgentDetail,
} from "@/lib/route-projection"

type AgentDetailPageShellProps = {
  /** The page's entry. It holds this page's language variant; other languages load from the per-entry JSON. */
  payload: AgentDetailPayload
  initialLanguage: ContentLanguage
  initialLocale?: UiLocale
}

const COPY_RESET_MS = 1600

export function AgentDetailPageShell({ payload, initialLanguage, initialLocale = "en" }: AgentDetailPageShellProps) {
  const item = payload.item
  const { locale, messages, setLocale } = useLocale(initialLocale, {
    initializationMode: "explicit-preferred",
  })
  const [activeLanguage, setActiveLanguage] = useState<ContentLanguage>(initialLanguage)
  const [copyLinkState, setCopyLinkState] = useState<"idle" | "done" | "failed">("idle")
  const [copyOriginalState, setCopyOriginalState] = useState<"idle" | "done" | "failed">("idle")

  // The page payload covers its own language. Any other language loads the whole entry on demand.
  const pageCoversLanguage = Boolean(item.variants[activeLanguage])
  const entryLoad = useAgentDetail(pageCoversLanguage ? null : item.agentId)
  const entryPayload =
    pageCoversLanguage ? payload : entryLoad.state.status === "ready" ? entryLoad.state.payload : null
  const detail = useMemo(() => resolveAgentDetail(entryPayload, activeLanguage), [entryPayload, activeLanguage])
  const info: AgentDetailItem = detail?.item ?? item
  const entryFailed = !pageCoversLanguage && entryLoad.state.status === "failed"

  useEffect(() => {
    if (copyLinkState === "idle") {
      return undefined
    }

    const timer = window.setTimeout(() => setCopyLinkState("idle"), COPY_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copyLinkState])

  useEffect(() => {
    if (copyOriginalState === "idle") {
      return undefined
    }

    const timer = window.setTimeout(() => setCopyOriginalState("idle"), COPY_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copyOriginalState])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    document.documentElement.lang = locale

    const path = buildAgentLanguagePath(item, detail?.activeLanguage ?? activeLanguage)
    const href = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString()
    const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (canonicalLink) {
      canonicalLink.href = href
    }
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.content = href
    }
  }, [activeLanguage, detail?.activeLanguage, item, locale])

  function handleSelectLanguage(language: ContentLanguage) {
    const nextLanguage = pickDetailLanguage(item, language)
    setActiveLanguage(nextLanguage)
    const projectedLocale = projectDetailLanguageToUiLocale(nextLanguage)
    if (projectedLocale) {
      setLocale(projectedLocale)
    }

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", buildAgentLanguagePath(item, nextLanguage))
    }
  }

  function handleLocaleChange(nextLocale: UiLocale) {
    setLocale(nextLocale)

    if (!item.availableLanguages.includes(nextLocale)) {
      return
    }

    const nextLanguage = pickDetailLanguage(item, nextLocale)
    if (nextLanguage === activeLanguage) {
      return
    }

    setActiveLanguage(nextLanguage)

    if (typeof window !== "undefined") {
      window.history.pushState(null, "", buildAgentLanguagePath(item, nextLanguage))
    }
  }

  async function copyCurrentLink() {
    if (typeof window === "undefined") {
      return
    }

    const href = new URL(buildAgentLanguagePath(item, detail?.activeLanguage ?? activeLanguage), window.location.origin).toString()
    const copied = await copyText(href)
    setCopyLinkState(copied ? "done" : "failed")
    if (copied) {
      captureSiteEvent("agent_link_copied", { agent_id: item.agentId })
    }
  }

  async function copyCurrentOriginal() {
    // Copy original needs the loaded variant; the button is disabled until then.
    if (typeof window === "undefined" || !detail) {
      return
    }

    const copied = await copyText(buildAgentVariantMarkdown(detail.activeVariant))
    setCopyOriginalState(copied ? "done" : "failed")
    if (copied) {
      captureSiteEvent("agent_markdown_copied", { agent_id: item.agentId })
    }
  }

  const shownLanguage = detail?.activeLanguage ?? activeLanguage

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface-base)] text-[color:var(--ink-strong)]">
      <div className="background-wash pointer-events-none fixed inset-0" />
      <div className="relative mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">
        <SiteHeader locale={locale} messages={messages} onLocaleChange={handleLocaleChange} />
      </div>

      <main className="relative mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:gap-6 lg:pb-12 lg:pt-6">
        <section className="workbench-shell rounded-[2.5rem] border border-[color:var(--section-border)] bg-[color:var(--section-surface)] px-6 py-7 text-[color:var(--section-text)] sm:px-7 lg:px-10 lg:py-9">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-display text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[color:var(--section-muted)]">{info.sourceLabel}</p>
              <h1 className="mt-4 font-display text-[clamp(3rem,6vw,5rem)] leading-[0.92] tracking-[-0.06em] text-[color:var(--section-text)]">
                {info.name}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:var(--section-muted)] sm:text-[1rem]">
                {detail ? detail.activeVariant.summary : info.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <a className="ghost-button" href="/agents/">
                {messages.backToCatalog}
              </a>
              <button type="button" data-copy-action="link" className="ghost-button" onClick={copyCurrentLink}>
                {copyLinkState === "done" ? messages.copied : copyLinkState === "failed" ? messages.copyFailed : messages.copyLink}
              </button>
              <button type="button" data-copy-action="raw" className="ghost-button" onClick={copyCurrentOriginal} disabled={!detail}>
                {copyOriginalState === "done"
                  ? messages.copied
                  : copyOriginalState === "failed"
                    ? messages.copyFailed
                    : messages.copyOriginal}
              </button>
              <a className="secondary-button" href={detail ? detail.activeVariant.sourceUrl : info.sourceUrl} target="_blank" rel="noreferrer">
                {messages.openSource}
              </a>
            </div>
          </div>

          {detail?.fallbackLanguage ? (
            <div className="mt-5 rounded-[1.2rem] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3 text-sm text-[color:var(--warning-ink)]">
              {formatMessage(messages.fallbackNotice, { language: detail.activeLanguage })}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2" aria-label={messages.languageSwitch}>
            {item.availableLanguages.map((language) => (
              <a
                key={language}
                href={buildAgentLanguagePath(item, language)}
                data-detail-language={language}
                onClick={(event) => {
                  event.preventDefault()
                  handleSelectLanguage(language)
                }}
                className={["ghost-button !min-h-0 !px-3 !py-2 !text-xs", activeLanguage === language ? "!text-[color:var(--contrast-pill-active-text)]" : ""].join(" ")}
                style={
                  activeLanguage === language
                    ? {
                        backgroundColor: "var(--contrast-pill-active-bg)",
                        borderColor: "var(--contrast-pill-active-border)",
                      }
                    : undefined
                }
              >
                {language}
              </a>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetaCard label={messages.canonicalId} value={info.agentId} />
            <MetaCard label={messages.typeFilter} value={typeLabel(info, messages)} />
            <MetaCard label={messages.sourceRepo} value={info.sourceRepo} />
            <MetaCard label={messages.shareableLink} value={buildAgentLanguagePath(info, shownLanguage)} />
          </div>
        </section>

        <section className="rounded-[2.25rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-6 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetaCard label={messages.sourceType} value={info.sourceType} />
            <MetaCard label={messages.model} value={info.model ?? "n/a"} />
            <MetaCard label={messages.availableLanguages} value={info.availableLanguages.join(" · ")} />
            <MetaCard label={messages.tools} value={info.tools.join(" · ")} />
          </div>

          {info.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {info.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <article className="mt-6 rounded-[1.75rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-5 sm:p-6">
            {detail ? (
              <MarkdownArticle body={detail.activeVariant.body} />
            ) : entryFailed ? (
              <div role="alert" data-testid="entry-body-failed" className="flex flex-col gap-3">
                <p className="text-sm leading-7 text-[color:var(--ink-strong)]">{messages.drawerFailed}</p>
                <div>
                  <button type="button" className="primary-button" onClick={entryLoad.retry}>
                    {messages.drawerRetry}
                  </button>
                </div>
              </div>
            ) : (
              <div role="status" aria-live="polite" data-testid="entry-body-loading" className="flex flex-col gap-3">
                <p className="text-sm leading-7 text-[color:var(--ink-soft)]">{messages.drawerLoading}</p>
                <span aria-hidden="true" className="block h-2.5 w-11/12 rounded bg-[color:var(--surface-muted)]" />
                <span aria-hidden="true" className="block h-2.5 w-10/12 rounded bg-[color:var(--surface-muted)]" />
                <span aria-hidden="true" className="block h-2.5 w-8/12 rounded bg-[color:var(--surface-muted)]" />
              </div>
            )}
          </article>
        </section>
      </main>

    </div>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] px-4 py-3">
      <p className="font-display text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-ink)]">{label}</p>
      <p className="mt-2 break-all text-sm leading-7 text-[color:var(--ink-strong)]">{value}</p>
    </div>
  )
}

function typeLabel(item: AgentDetailItem, messages: LocaleMessages) {
  if (item.type === "reviewer") {
    return messages.typeReviewer
  }

  if (item.type === "build-resolver") {
    return messages.typeBuildResolver
  }

  return humanizeCatalogValue(item.type)
}
