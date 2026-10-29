// Build-time only. Reads the generated snapshot and derives every route-scoped payload.
// Client modules must never import this file (enforced by src/lib/import-boundary.test.ts).

import { createHash } from "node:crypto"

import snapshotData from "@/data/generated/agent-catalog.json"
import type {
  AgentCatalogItem,
  AgentCatalogSnapshot,
  AgentDetailItem,
  AgentDetailPayload,
  AgentDetailVariant,
  AgentType,
  AgentVariant,
  CatalogListItem,
  CatalogMeta,
  ContentLanguage,
  FeaturedCard,
  SearchShardDescriptor,
  SourceMeta,
  UiLocale,
} from "@/data/ui-constants"
import { selectFeaturedCardsByLocale, type FeaturedSelectionOptions } from "@/lib/featured-selection"
import { getFreshnessState } from "@/lib/route-projection"

export type CatalogStats = {
  totalAgents: number
  totalSources: number
  totalLanguages: number
  lastSyncedAt: string
}

export type CatalogSummary = {
  totalAgents: number
  totalSources: number
  totalLanguages: number
  totalTypes: number
}

export type SearchShard = SearchShardDescriptor & {
  hash: string
  /** Serialized payload: `{ language, entries: { [agentId]: lower-cased "title summary bodyPlainText" } }`. */
  json: string
}

const catalogSnapshot = snapshotData as AgentCatalogSnapshot

export function loadCatalogSnapshot(): AgentCatalogSnapshot {
  return catalogSnapshot
}

export function loadCatalogItems(snapshot: AgentCatalogSnapshot = catalogSnapshot): AgentCatalogItem[] {
  return snapshot.items
}

export function loadCatalogSources(snapshot: AgentCatalogSnapshot = catalogSnapshot): SourceMeta[] {
  return snapshot.sources
}

export function getCatalogStats(snapshot: AgentCatalogSnapshot = catalogSnapshot): CatalogStats {
  return {
    totalAgents: snapshot.items.length,
    totalSources: snapshot.sources.length,
    totalLanguages: Object.keys(snapshot.languageIndex).length,
    lastSyncedAt: snapshot.lastSyncedAt,
  }
}

export function getAvailableLanguages(snapshot: AgentCatalogSnapshot = catalogSnapshot): ContentLanguage[] {
  return Object.keys(snapshot.languageIndex).sort((left, right) => left.localeCompare(right))
}

export function buildCatalogSummary(snapshot: AgentCatalogSnapshot = catalogSnapshot): CatalogSummary {
  return {
    totalAgents: snapshot.items.length,
    totalSources: snapshot.sources.length,
    totalLanguages: Object.keys(snapshot.languageIndex).length,
    totalTypes: new Set(snapshot.items.map((item) => item.type)).size,
  }
}

export function getSourceMetrics(snapshot: AgentCatalogSnapshot = catalogSnapshot) {
  return snapshot.sources.map((source) => ({
    ...source,
    freshness: getFreshnessState(source.lastSyncedAt),
  }))
}

/** Lists, filter counts and sources that the islands need to validate URLs and render filter toolbars. */
export function buildCatalogMeta(snapshot: AgentCatalogSnapshot = catalogSnapshot): CatalogMeta {
  const contentLanguages = getAvailableLanguages(snapshot)
  const agentTypes = Array.from(new Set(snapshot.items.map((item) => item.type))).sort((left, right) => left.localeCompare(right))

  return {
    totalAgents: snapshot.items.length,
    totalLanguages: contentLanguages.length,
    totalTypes: agentTypes.length,
    sources: snapshot.sources,
    contentLanguages,
    agentTypes,
    sourceCounts: Object.fromEntries(countBy(snapshot.items, (item) => item.sourceId)),
    languageCounts: Object.fromEntries(countByMany(snapshot.items, (item) => item.availableLanguages)),
    typeCounts: Object.fromEntries(countBy(snapshot.items, (item) => item.type)) as Record<AgentType, number>,
  }
}

/** Every agent without its variant collection. */
export function buildListItems(snapshot: AgentCatalogSnapshot = catalogSnapshot): CatalogListItem[] {
  return snapshot.items.map(toListItem)
}

/** One pre-resolved card per UI locale; the selection keeps the existing order and rng hook. */
export function buildFeaturedCards(
  snapshot: AgentCatalogSnapshot = catalogSnapshot,
  options?: FeaturedSelectionOptions
): Record<UiLocale, FeaturedCard[]> {
  return selectFeaturedCardsByLocale(snapshot, options)
}

/** The entry for one agent, with every variant but without `bodyPlainText`. */
export function buildDetailPayload(agentId: string, snapshot: AgentCatalogSnapshot = catalogSnapshot): AgentDetailPayload | null {
  const item = snapshot.items.find((entry) => entry.agentId === agentId)
  return item ? buildEntryPayload(item, snapshot) : null
}

/**
 * The payload for one entry. With `language`, only that language's variant is kept: a detail page
 * renders its own variant and loads the others from the per-entry JSON when the reader switches.
 */
export function buildEntryPayload(
  item: AgentCatalogItem,
  snapshot: AgentCatalogSnapshot = catalogSnapshot,
  language?: ContentLanguage
): AgentDetailPayload {
  return {
    item: buildDetailItem(item, language),
    source: snapshot.sources.find((source) => source.id === item.sourceId) ?? null,
  }
}

function toListItem(item: AgentCatalogItem): CatalogListItem {
  return Object.fromEntries(Object.entries(item).filter(([key]) => key !== "variants")) as CatalogListItem
}

function toDetailVariant(variant: AgentVariant): AgentDetailVariant {
  return Object.fromEntries(Object.entries(variant).filter(([key]) => key !== "bodyPlainText")) as AgentDetailVariant
}

export function buildDetailItem(item: AgentCatalogItem, language?: ContentLanguage): AgentDetailItem {
  const { variants, ...rest } = item

  return {
    ...rest,
    variants: Object.fromEntries(
      Object.entries(variants)
        .filter(([variantLanguage]) => language === undefined || variantLanguage === language)
        .map(([variantLanguage, variant]) => [variantLanguage, toDetailVariant(variant)])
    ),
  }
}

/** One search shard per content language that has at least one variant, with a content hash in its URL. */
export function buildSearchShards(snapshot: AgentCatalogSnapshot = catalogSnapshot): SearchShard[] {
  return getAvailableLanguages(snapshot).flatMap((language) => {
    const entries: Record<string, string> = {}

    for (const item of snapshot.items) {
      const variant = item.variants[language]
      if (variant) {
        entries[item.agentId] = [variant.title, variant.summary, variant.bodyPlainText].join(" ").toLowerCase()
      }
    }

    const entryCount = Object.keys(entries).length
    if (entryCount === 0) {
      return []
    }

    const json = JSON.stringify({ language, entries })
    const hash = createHash("sha256").update(json).digest("hex").slice(0, 10)

    return [
      {
        language,
        entryCount,
        hash,
        json,
        url: `/data/search/${language}.${hash}.json`,
      },
    ]
  })
}

export function searchShardFileName(shard: Pick<SearchShard, "language" | "hash">): string {
  return `${shard.language}.${shard.hash}`
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>()

  for (const item of items) {
    const key = selector(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
}

function countByMany<T>(items: T[], selector: (item: T) => string[]) {
  const counts = new Map<string, number>()

  for (const item of items) {
    for (const key of selector(item)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return counts
}
