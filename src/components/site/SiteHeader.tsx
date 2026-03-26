import type { UiLocale } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"

import { getHeaderNavigationLinks, getSiteLinkRel, getSiteLinkTarget } from "./site-links"

type SiteHeaderProps = {
  locale: UiLocale
  messages: LocaleMessages
  onLocaleChange: (locale: UiLocale) => void
}

export function SiteHeader({ locale, messages, onLocaleChange }: SiteHeaderProps) {
  const links = getHeaderNavigationLinks(messages)

  return (
    <header className="site-header" role="banner">
      <div className="site-header-inner">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="/"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--accent-strong)]/25 bg-[color:var(--accent-strong)]/12 text-base font-semibold text-[color:var(--accent-strong)] shadow-[0_8px_28px_-14px_rgba(156,79,43,0.6)]"
          >
            T
          </a>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <a href="/" className="font-display text-xl tracking-[0.03em] text-[color:var(--ink-strong)]">
                HagiTrait
              </a>
              <span className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">{messages.headerBrandBadge}</span>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-[color:var(--ink-soft)]">{messages.headerDescription}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 lg:items-end">
          <nav className="flex flex-wrap items-center gap-1.5" aria-label={messages.headerNavAria}>
            <a className="site-link-chip" href="/agents/">
              {messages.catalogTitle}
            </a>
            {links.map((link) => (
              <a
                key={link.id}
                className="site-link-chip"
                href={link.href}
                aria-label={link.ariaLabel}
                target={getSiteLinkTarget(link)}
                rel={getSiteLinkRel(link)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line-soft)] bg-white/60 p-1">
            <button
              type="button"
              data-locale-switch="en"
              className={["filter-pill !border-0 !px-3 !py-1 !text-xs", locale === "en" ? "is-active" : ""].join(" ")}
              onClick={() => onLocaleChange("en")}
            >
              {messages.localeEnglish}
            </button>
            <button
              type="button"
              data-locale-switch="zh-CN"
              className={["filter-pill !border-0 !px-3 !py-1 !text-xs", locale === "zh-CN" ? "is-active" : ""].join(" ")}
              onClick={() => onLocaleChange("zh-CN")}
            >
              {messages.localeChinese}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
