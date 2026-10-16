import type { LocaleMessages } from "@/i18n/locales/en"

export type SiteHeaderLink = {
  id: string
  label: string
  href: string
  ariaLabel: string
  external: boolean
  openInNewTab: boolean
}

const headerLinkDefinitions = [
  {
    id: "docs",
    labelKey: "siteLinksDocs",
    ariaLabelKey: "siteLinksDocsAria",
    href: "https://docs.hagicode.com/",
  },
  {
    id: "website",
    labelKey: "siteLinksWebsite",
    ariaLabelKey: "siteLinksWebsiteAria",
    href: "https://hagicode.com",
  },
  {
    id: "soul",
    labelKey: "siteLinksSoul",
    ariaLabelKey: "siteLinksSoulAria",
    href: "https://soul.hagicode.com",
  },
  {
    id: "discord",
    labelKey: "siteLinksDiscord",
    ariaLabelKey: "siteLinksDiscordAria",
    href: "https://discord.gg/qY662sJK",
  },
] as const satisfies readonly {
  id: string
  labelKey: keyof LocaleMessages
  ariaLabelKey: keyof LocaleMessages
  href: string
}[]

export function getHeaderNavigationLinks(messages: LocaleMessages): readonly SiteHeaderLink[] {
  return headerLinkDefinitions.map((link) => ({
    id: link.id,
    href: link.href,
    label: messages[link.labelKey],
    ariaLabel: messages[link.ariaLabelKey],
    external: true,
    openInNewTab: true,
  }))
}

export function getSiteLinkTarget(link: Pick<SiteHeaderLink, "openInNewTab">) {
  return link.openInNewTab ? "_blank" : undefined
}

const SAME_ORIGIN_BASE = "https://same-origin.invalid"

/**
 * First-party link policy, mirrored from @hagicode/hagilight-core links. Relative and same-origin
 * destinations count as first-party; hosts are compared after parsing, never by substring.
 */
export function isFirstPartyHref(href: string): boolean {
  let url: URL
  try {
    url = new URL(href, SAME_ORIGIN_BASE)
  } catch {
    return false
  }
  if (url.origin === SAME_ORIGIN_BASE) return true
  if (url.protocol !== "https:" && url.protocol !== "http:") return false

  const host = url.hostname.toLowerCase()
  if (host === "hagicode.com" || host.endsWith(".hagicode.com")) return true
  return host === "github.com" && url.pathname.split("/")[1]?.toLowerCase() === "hagicode-org"
}

export function getSiteLinkRel(link: Pick<SiteHeaderLink, "href" | "openInNewTab">) {
  if (!link.openInNewTab) return undefined
  return isFirstPartyHref(link.href) ? "noopener" : "noopener noreferrer"
}
