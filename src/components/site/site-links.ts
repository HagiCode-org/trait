export type SiteLinkId = "docs" | "website" | "soul" | "github" | "discord" | "qq-group" | "email" | "icp" | "public-security"

export type SiteLink = {
  id: SiteLinkId
  label: string
  href: string
  ariaLabel: string
  external: boolean
  openInNewTab: boolean
}

export type SiteLinkSection = {
  id: string
  title: string
  links: readonly SiteLink[]
}

const NEW_TAB_TARGET = "_blank" as const
const EXTERNAL_REL = "noopener noreferrer" as const

const traitSiteLinkDefinitions = {
  docs: {
    id: "docs" as const,
    labelKey: "siteLinksDocs",
    ariaLabelKey: "siteLinksDocsAria",
    href: "https://docs.hagicode.com/",
    external: true,
    openInNewTab: true,
  },
  website: {
    id: "website" as const,
    labelKey: "siteLinksWebsite",
    ariaLabelKey: "siteLinksWebsiteAria",
    href: "https://hagicode.com",
    external: true,
    openInNewTab: true,
  },
  soul: {
    id: "soul" as const,
    labelKey: "siteLinksSoul",
    ariaLabelKey: "siteLinksSoulAria",
    href: "https://soul.hagicode.com",
    external: true,
    openInNewTab: true,
  },
  github: {
    id: "github" as const,
    labelKey: "siteLinksGithub",
    ariaLabelKey: "siteLinksGithubAria",
    href: "https://github.com/HagiCode-org",
    external: true,
    openInNewTab: true,
  },
  discord: {
    id: "discord" as const,
    labelKey: "siteLinksDiscord",
    ariaLabelKey: "siteLinksDiscordAria",
    href: "https://discord.gg/qY662sJK",
    external: true,
    openInNewTab: true,
  },
  qqGroup: {
    id: "qq-group" as const,
    labelKey: "siteLinksQQGroup",
    ariaLabelKey: "siteLinksQQGroupAria",
    href: "https://qm.qq.com/q/Fwb0o094kw",
    external: true,
    openInNewTab: true,
  },
  email: {
    id: "email" as const,
    labelKey: "siteLinksEmail",
    ariaLabelKey: "siteLinksEmailAria",
    href: "mailto:support@hagicode.com",
    external: true,
    openInNewTab: false,
  },
} as const

const filingLinkDefinitions = {
  icp: {
    id: "icp" as const,
    label: "\u95FDICP\u59072026004153\u53F7-1",
    href: "https://beian.miit.gov.cn/",
    ariaLabelKey: "siteLinksIcpAria",
    external: true,
    openInNewTab: true,
  },
  publicSecurity: {
    id: "public-security" as const,
    label: "\u95FD\u516C\u7F51\u5B89\u590735011102351148\u53F7",
    href: "http://www.beian.gov.cn/portal/registerSystemInfo",
    ariaLabelKey: "siteLinksPublicSecurityAria",
    external: true,
    openInNewTab: true,
  },
} as const

function resolveLabel(
  messages: Record<string, string>,
  key: string
) {
  return messages[key] ?? key
}

export function getHeaderNavigationLinks(
  messages: Record<string, string>
): readonly SiteLink[] {
  return [
    buildLink(messages, traitSiteLinkDefinitions.docs),
    buildLink(messages, traitSiteLinkDefinitions.website),
    buildLink(messages, traitSiteLinkDefinitions.soul),
    buildLink(messages, traitSiteLinkDefinitions.discord),
  ]
}

export function getFooterLinkSections(
  messages: Record<string, string>
): readonly SiteLinkSection[] {
  return [
    {
      id: "related",
      title: resolveLabel(messages, "footerSectionRelated"),
      links: [
        buildLink(messages, traitSiteLinkDefinitions.docs),
        buildLink(messages, traitSiteLinkDefinitions.website),
        buildLink(messages, traitSiteLinkDefinitions.soul),
      ],
    },
    {
      id: "community",
      title: resolveLabel(messages, "footerSectionCommunity"),
      links: [
        buildLink(messages, traitSiteLinkDefinitions.github),
        buildLink(messages, traitSiteLinkDefinitions.discord),
        buildLink(messages, traitSiteLinkDefinitions.qqGroup),
        buildLink(messages, traitSiteLinkDefinitions.email),
      ],
    },
  ]
}

export function getFilingLinks(
  messages: Record<string, string>
): readonly SiteLink[] {
  return [
    {
      id: filingLinkDefinitions.icp.id,
      label: filingLinkDefinitions.icp.label,
      href: filingLinkDefinitions.icp.href,
      external: filingLinkDefinitions.icp.external,
      openInNewTab: filingLinkDefinitions.icp.openInNewTab,
      ariaLabel: resolveLabel(messages, filingLinkDefinitions.icp.ariaLabelKey),
    },
    {
      id: filingLinkDefinitions.publicSecurity.id,
      label: filingLinkDefinitions.publicSecurity.label,
      href: filingLinkDefinitions.publicSecurity.href,
      external: filingLinkDefinitions.publicSecurity.external,
      openInNewTab: filingLinkDefinitions.publicSecurity.openInNewTab,
      ariaLabel: resolveLabel(messages, filingLinkDefinitions.publicSecurity.ariaLabelKey),
    },
  ]
}

export function getSiteLinkTarget(link: Pick<SiteLink, "openInNewTab">) {
  return link.openInNewTab ? NEW_TAB_TARGET : undefined
}

export function getSiteLinkRel(link: Pick<SiteLink, "openInNewTab">) {
  return link.openInNewTab ? EXTERNAL_REL : undefined
}

function buildLink(
  messages: Record<string, string>,
  def: (typeof traitSiteLinkDefinitions)[keyof typeof traitSiteLinkDefinitions]
): SiteLink {
  return {
    id: def.id,
    href: def.href,
    external: def.external,
    openInNewTab: def.openInNewTab,
    label: resolveLabel(messages, def.labelKey),
    ariaLabel: resolveLabel(messages, def.ariaLabelKey),
  }
}
