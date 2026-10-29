import { uiLocales, type AgentCatalogItem, type AgentCatalogSnapshot, type AgentVariant, type ContentLanguage, type FeaturedCard, type UiLocale } from "@/data/ui-constants"

export const FEATURED_SELECTION_SIZE = 24
export const FEATURED_SLIDE_SIZE = 8

export type FeaturedSelectionOptions = {
  targetSize?: number
  rng?: () => number
}

export type FeaturedCardsByLocale = Record<UiLocale, FeaturedCard[]>

/** Selects the featured items for each UI locale and resolves the variant each card shows. */
export function selectFeaturedCardsByLocale(
  snapshot: AgentCatalogSnapshot,
  { targetSize = FEATURED_SELECTION_SIZE, rng = Math.random }: FeaturedSelectionOptions = {}
): FeaturedCardsByLocale {
  return Object.fromEntries(
    uiLocales.map((locale) => [
      locale,
      selectFeaturedItems(snapshot.items, locale, targetSize, rng).map((item) => toFeaturedCard(item, locale)),
    ])
  ) as FeaturedCardsByLocale
}

export function toFeaturedCard(item: AgentCatalogItem, locale: UiLocale): FeaturedCard {
  const variant = pickFeaturedVariant(item, locale)

  return {
    agentId: item.agentId,
    defaultLanguage: item.defaultLanguage,
    availableLanguages: item.availableLanguages,
    language: variant.language,
    sourceLabel: item.sourceLabel,
    type: item.type,
    title: variant.title,
    summary: variant.summary,
  }
}

/** The first variant in the locale's language order, falling back to the default language. */
export function pickFeaturedVariant(item: AgentCatalogItem, locale: UiLocale): AgentVariant {
  for (const language of buildSelectionLanguageOrder(locale)) {
    const variant = item.variants[language]
    if (variant) {
      return variant
    }
  }

  return item.variants[item.defaultLanguage] ?? item.variants[item.availableLanguages[0]]
}

function selectFeaturedItems(items: AgentCatalogItem[], locale: UiLocale, targetSize: number, rng: () => number) {
  const selectedItems = []
  const seenAgentIds = new Set<string>()

  for (const language of buildSelectionLanguageOrder(locale)) {
    const localizedItems = shuffleItems(
      items.filter((item) => item.availableLanguages.includes(language) && !seenAgentIds.has(item.agentId)),
      rng
    )

    for (const item of localizedItems) {
      selectedItems.push(item)
      seenAgentIds.add(item.agentId)

      if (selectedItems.length >= targetSize) {
        return selectedItems
      }
    }
  }

  return selectedItems
}

function buildSelectionLanguageOrder(locale: UiLocale): ContentLanguage[] {
  if (locale === "zh-Hant") {
    return ["zh-Hant", "zh-CN", "en"]
  }

  if (locale.startsWith("zh")) {
    return [locale, "zh-CN", "en"]
  }

  return [locale, "en"]
}

function shuffleItems<T>(items: T[], rng: () => number) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(rng() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[nextIndex]
    shuffled[nextIndex] = current
  }

  return shuffled
}

export function chunkFeaturedItems<T>(items: T[], size = FEATURED_SLIDE_SIZE): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}
