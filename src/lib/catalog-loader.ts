import snapshotData from "@/data/generated/agent-catalog.json"
import type { AgentCatalogItem, AgentCatalogSnapshot, ContentLanguage, SourceMeta } from "@/data/trait-catalog"

export type CatalogStats = {
  totalAgents: number
  totalSources: number
  totalLanguages: number
  lastSyncedAt: string
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
