import { uiLocales, type AgentCatalogItem, type AgentCatalogSnapshot, type ContentLanguage, type UiLocale } from "@/data/trait-catalog"

export const FEATURED_SELECTION_SIZE = 24
export const FEATURED_SLIDE_SIZE = 8

type FeaturedSelectionOptions = {
  targetSize?: number
  rng?: () => number
}

export type FeaturedItemsByLocale = Record<UiLocale, AgentCatalogItem[]>

export function selectFeaturedItemsByLocale(
  snapshot: AgentCatalogSnapshot,
  { targetSize = FEATURED_SELECTION_SIZE, rng = Math.random }: FeaturedSelectionOptions = {}
): FeaturedItemsByLocale {
  return Object.fromEntries(
    uiLocales.map((locale) => [locale, selectFeaturedItems(snapshot.items, locale, targetSize, rng)])
  ) as FeaturedItemsByLocale
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

function shuffleItems(items: AgentCatalogItem[], rng: () => number) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(rng() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[nextIndex]
    shuffled[nextIndex] = current
  }

  return shuffled
}

export function chunkFeaturedItems(items: AgentCatalogItem[], size = FEATURED_SLIDE_SIZE) {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}
