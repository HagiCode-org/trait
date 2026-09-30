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

export function getSiteLinkRel(link: Pick<SiteHeaderLink, "openInNewTab">) {
  return link.openInNewTab ? "noopener noreferrer" : undefined
}
