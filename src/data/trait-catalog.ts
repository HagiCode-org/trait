// Server-side facade over the generated snapshot. Build-time code (pages, endpoints,
// catalog-loader callers) imports from here. Client modules must not: import
// runtime constants and types from ./ui-constants instead.

import { loadCatalogSnapshot } from "@/lib/catalog-loader"

export * from "@/data/ui-constants"

export const agentCatalogSnapshot = loadCatalogSnapshot()
export const traitCatalog = agentCatalogSnapshot.items
export const sourceCatalog = agentCatalogSnapshot.sources
export const contentLanguages = Object.keys(agentCatalogSnapshot.languageIndex).sort((left, right) => left.localeCompare(right))
export const agentTypes = Array.from(new Set(agentCatalogSnapshot.items.map((item) => item.type))).sort((left, right) =>
  left.localeCompare(right)
)
