import type { LocaleMessages } from "@/i18n/locales/en"

import { getFilingLinks, getFooterLinkSections, getSiteLinkRel, getSiteLinkTarget } from "./site-links"

type SiteFooterProps = {
  locale: "zh-CN" | "en"
  messages: LocaleMessages
}

export function SiteFooter({ locale, messages }: SiteFooterProps) {
  const currentYear = new Date().getFullYear()
  const sections = getFooterLinkSections(messages, locale)
  const filingLinks = getFilingLinks(messages)

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer-grid">
        <section className="site-footer-brand" aria-label={messages.footerBrandSectionAria}>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted-ink)]">HagiTrait</p>
          <h2 className="font-display text-2xl tracking-[0.03em] text-[color:var(--ink-strong)]">HagiTrait</h2>
          <p className="mt-2 max-w-[28rem] text-sm leading-7 text-[color:var(--ink-soft)]">{messages.footerDescription}</p>
          <p className="mt-3 text-xs text-[color:var(--muted-ink)]">
            {messages.footerCopyright.replace("{{year}}", String(currentYear))}
          </p>
        </section>

        {sections.map((section) => (
          <nav key={section.id} className="site-footer-section" aria-label={section.title}>
            <h2 className="site-footer-title">{section.title}</h2>
            <div className="site-footer-links">
              {section.links.map((link) => (
                <a
                  key={link.id}
                  className="site-footer-link"
                  href={link.href}
                  aria-label={link.ariaLabel}
                  target={getSiteLinkTarget(link)}
                  rel={getSiteLinkRel(link)}
                >
                  <span className="site-footer-link-text">{link.label}</span>
                  {link.description ? <span className="site-footer-link-description">{link.description}</span> : null}
                </a>
              ))}
            </div>
          </nav>
        ))}
      </div>

      <div className="site-footer-filings">
        {filingLinks.map((link) => (
          <a
            key={link.id}
            className="site-filing-link"
            href={link.href}
            aria-label={link.ariaLabel}
            target={getSiteLinkTarget(link)}
            rel={getSiteLinkRel(link)}
          >
            {link.label}
          </a>
        ))}
      </div>
    </footer>
  )
}
