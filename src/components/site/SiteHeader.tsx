import { UI_LOCALE_LABELS, uiLocales, type UiLocale } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"
import { useTheme } from "@/lib/use-theme"

import { getHeaderNavigationLinks, getSiteLinkRel, getSiteLinkTarget } from "./site-links"

type SiteHeaderProps = {
  locale: UiLocale
  messages: LocaleMessages
  onLocaleChange: (locale: UiLocale) => void
}

export function SiteHeader({ locale, messages, onLocaleChange }: SiteHeaderProps) {
  const links = getHeaderNavigationLinks(messages)
  const { theme, setTheme } = useTheme()

  return (
    <header className="site-header" role="banner">
      <div className="site-header-inner">
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="/"
            className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-card)]"
            aria-label="HagiCode home"
          >
            <img src="/logo.png" alt="HagiCode" width="32" height="32" className="size-8 object-contain" />
          </a>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <a href="/" className="font-display text-[1.35rem] tracking-[-0.03em] text-[color:var(--ink-strong)]">
                HagiTrait
              </a>
              <span className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] px-2.5 py-1 font-display text-[0.62rem] font-medium uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
                {messages.headerBrandBadge}
              </span>
            </div>
            <p className="mt-1 max-w-[32rem] text-sm leading-6 text-[color:var(--ink-soft)]">{messages.headerDescription}</p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2.5 lg:items-end">
          <nav className="flex flex-wrap items-center gap-2" aria-label={messages.headerNavAria}>
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

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] p-1" aria-label={messages.themeToggleAria}>
              <button
                type="button"
                data-theme-switch="dark"
                aria-pressed={theme === "dark"}
                className={["filter-pill !min-h-0 !border-0 !px-3 !py-2 !text-xs", theme === "dark" ? "is-active" : ""].join(" ")}
                onClick={() => setTheme("dark")}
              >
                {messages.themeDark}
              </button>
              <button
                type="button"
                data-theme-switch="light"
                aria-pressed={theme === "light"}
                className={["filter-pill !min-h-0 !border-0 !px-3 !py-2 !text-xs", theme === "light" ? "is-active" : ""].join(" ")}
                onClick={() => setTheme("light")}
              >
                {messages.themeLight}
              </button>
            </div>

            <div className="inline-flex items-center rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] px-3 py-1.5">
              <select
                aria-label={messages.contentLanguageFilter}
                data-locale-select="true"
                value={locale}
                className="site-locale-select min-w-[11rem] text-sm text-[color:var(--ink-strong)] outline-none"
                onChange={(event) => onLocaleChange(event.target.value as UiLocale)}
              >
                {uiLocales.map((option) => (
                  <option key={option} value={option}>
                    {UI_LOCALE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
