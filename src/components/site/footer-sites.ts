import footerSitesSnapshot from "@/data/generated/footer-sites.snapshot.json"
import type { UiLocale } from "@/data/trait-catalog"

type FooterCatalogLocale = "zh-CN" | "zh-Hant" | "en-US" | "ja-JP" | "ko-KR" | "de-DE" | "fr-FR" | "es-ES" | "pt-BR" | "ru-RU"
type LocalizedFooterField = string | Readonly<Record<FooterCatalogLocale, string>>

type FooterSnapshotEntry = {
  id: string
  title: LocalizedFooterField
  description: LocalizedFooterField
  url: string
}

function normalizeUrl(url: string) {
  const normalized = new URL(url)
  normalized.hash = ""
  normalized.search = ""
  const pathname = normalized.pathname.replace(/\/+$/u, "")
  normalized.pathname = pathname || "/"
  return normalized.toString()
}

function resolveFooterLocale(locale: UiLocale): FooterCatalogLocale {
  return locale === "en" ? "en-US" : locale
}

function getFooterLocaleFallbackChain(locale: FooterCatalogLocale): readonly FooterCatalogLocale[] {
  return locale === "zh-Hant" ? ["zh-CN", "en-US"] : ["en-US"]
}

function resolveLocalizedField(field: LocalizedFooterField, locale: FooterCatalogLocale): string {
  if (typeof field === "string") {
    return field
  }

  for (const candidate of [locale, ...getFooterLocaleFallbackChain(locale)]) {
    const value = field[candidate]
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }

  for (const value of Object.values(field)) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }

  return ""
}

function buildLocalizedEntry(entry: FooterSnapshotEntry, locale: UiLocale) {
  const resolvedLocale = resolveFooterLocale(locale)
  return {
    id: entry.id,
    title: resolveLocalizedField(entry.title, resolvedLocale),
    description: resolveLocalizedField(entry.description, resolvedLocale),
    url: entry.url,
  }
}

export function resolveFooterSiteEntryById(siteId: string, locale: UiLocale) {
  const entry = footerSitesSnapshot.entries.find((item) => item.id === siteId) as FooterSnapshotEntry | undefined
  return entry ? buildLocalizedEntry(entry, locale) : null
}

export function resolveFooterSiteEntryByUrl(url: string, locale: UiLocale) {
  const normalizedUrl = normalizeUrl(url)
  const entry = footerSitesSnapshot.entries.find(
    (item) => normalizeUrl((item as FooterSnapshotEntry).url) === normalizedUrl,
  ) as FooterSnapshotEntry | undefined
  return entry ? buildLocalizedEntry(entry, locale) : null
}
