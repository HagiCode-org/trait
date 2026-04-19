import type { AgentCatalogItem, ContentLanguage } from "@/data/trait-catalog"
import { TRAIT_SITE_NAME, TRAIT_SITE_TAGLINE, TRAIT_SITE_URL, TRAIT_SOCIAL_IMAGE_PATH } from "@/lib/site-config"
import { buildAgentAlternatePaths, buildAgentLanguagePath } from "@/lib/route-projection"

const HAGICODE_MAIN_URL = "https://hagicode.com/"
const HAGICODE_DOCS_URL = "https://docs.hagicode.com/"
const HAGICODE_COST_URL = "https://cost.hagicode.com/"
const HAGICODE_SOUL_URL = "https://soul.hagicode.com/"

export type MetadataLink = {
  hreflang: string
  href: string
}

export type PageMetadata = {
  title: string
  description: string
  canonical: string
  openGraph: {
    title: string
    description: string
    type: "website" | "article"
    url: string
    image: string
  }
  twitter: {
    card: "summary_large_image"
    title: string
    description: string
    image: string
  }
  alternates: MetadataLink[]
  jsonLd: Record<string, unknown>[]
}

export function buildHomeMetadata(totalAgents: number): PageMetadata {
  const title = `${TRAIT_SITE_NAME} | Search ${totalAgents} HagiCode Agents`
  const description = `${TRAIT_SITE_TAGLINE} Browse ${totalAgents} canonical entries with server-rendered summaries.`
  const canonical = absoluteUrl("/")

  return buildBaseMetadata({
    title,
    description,
    canonical,
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: TRAIT_SITE_NAME,
        url: canonical,
        description,
        isPartOf: buildEcosystemSiteReference(),
        publisher: buildHagicodeOrganizationReference(),
        potentialAction: {
          "@type": "SearchAction",
          target: `${absoluteUrl("/agents/")}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      buildHagicodeOrganizationNode(),
    ],
  })
}

export function buildCatalogMetadata(totalAgents: number): PageMetadata {
  const title = `${TRAIT_SITE_NAME} Catalog | Browse ${totalAgents} Canonical Agents`
  const description = `Browse ${totalAgents} canonical agents with server-rendered summaries, source metadata, language availability, and direct detail routes.`
  const canonical = absoluteUrl("/agents/")

  return buildBaseMetadata({
    title,
    description,
    canonical,
    type: "website",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        url: canonical,
        description,
        isPartOf: {
          "@type": "WebSite",
          name: TRAIT_SITE_NAME,
          url: absoluteUrl("/"),
        },
        about: buildHagicodeOrganizationReference(),
        publisher: buildHagicodeOrganizationReference(),
      },
      buildHagicodeOrganizationNode(),
    ],
  })
}

export function buildAgentDetailMetadata(item: AgentCatalogItem, language: ContentLanguage): PageMetadata {
  const variant = item.variants[language] ?? item.variants[item.defaultLanguage]
  const pagePath = buildAgentLanguagePath(item, language)
  const canonical = absoluteUrl(pagePath)
  const title = `${variant.title} | ${TRAIT_SITE_NAME}`
  const description = trimDescription(variant.summary || item.summary)
  const alternates = buildAlternateLinks(item)

  return buildBaseMetadata({
    title,
    description,
    canonical,
    type: "article",
    alternates,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: variant.title,
        description,
        inLanguage: language,
        url: canonical,
        isPartOf: {
          "@type": "CollectionPage",
          name: `${TRAIT_SITE_NAME} Catalog`,
          url: absoluteUrl("/agents/"),
        },
        about: buildHagicodeOrganizationReference(),
        publisher: buildHagicodeOrganizationReference(),
        provider: {
          "@type": "Organization",
          name: item.sourceLabel,
          url: item.sourceUrl,
        },
        keywords: item.tags.join(", "),
      },
      buildHagicodeOrganizationNode(),
    ],
  })
}

function buildBaseMetadata({
  title,
  description,
  canonical,
  type,
  alternates = [],
  jsonLd,
}: {
  title: string
  description: string
  canonical: string
  type: "website" | "article"
  alternates?: MetadataLink[]
  jsonLd: Record<string, unknown>[]
}): PageMetadata {
  const image = absoluteUrl(TRAIT_SOCIAL_IMAGE_PATH)

  return {
    title,
    description,
    canonical,
    openGraph: {
      title,
      description,
      type,
      url: canonical,
      image,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
    },
    alternates,
    jsonLd,
  }
}

function buildAlternateLinks(item: AgentCatalogItem): MetadataLink[] {
  const paths = buildAgentAlternatePaths(item)

  return [
    ...Object.entries(paths).map(([language, href]) => ({
      hreflang: language,
      href: absoluteUrl(href),
    })),
    {
      hreflang: "x-default",
      href: absoluteUrl(buildAgentLanguagePath(item, item.defaultLanguage)),
    },
  ]
}

function trimDescription(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ")
  if (normalized.length <= 160) {
    return normalized
  }

  return `${normalized.slice(0, 157)}...`
}

function absoluteUrl(pathname: string) {
  return new URL(pathname, TRAIT_SITE_URL).toString()
}

function buildEcosystemSiteReference() {
  return {
    "@type": "WebSite",
    "@id": `${HAGICODE_MAIN_URL}#website`,
    name: "HagiCode",
    url: HAGICODE_MAIN_URL,
  }
}

function buildHagicodeOrganizationReference() {
  return {
    "@id": `${HAGICODE_MAIN_URL}#organization`,
  }
}

function buildHagicodeOrganizationNode() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${HAGICODE_MAIN_URL}#organization`,
    name: "HagiCode",
    url: HAGICODE_MAIN_URL,
    sameAs: [
      HAGICODE_MAIN_URL,
      HAGICODE_DOCS_URL,
      HAGICODE_COST_URL,
      HAGICODE_SOUL_URL,
      TRAIT_SITE_URL,
    ],
  }
}
