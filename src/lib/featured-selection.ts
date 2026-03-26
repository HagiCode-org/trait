import type { AgentCatalogItem, AgentCatalogSnapshot, UiLocale } from "@/data/trait-catalog"

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
  return {
    en: selectFeaturedItems(snapshot.items, "en", targetSize, rng),
    "zh-CN": selectFeaturedItems(snapshot.items, "zh-CN", targetSize, rng),
  }
}

function selectFeaturedItems(items: AgentCatalogItem[], language: string, targetSize: number, rng: () => number) {
  const localizedItems = items.filter((item) => item.availableLanguages.includes(language))
  return shuffleItems(localizedItems, rng).slice(0, targetSize)
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
