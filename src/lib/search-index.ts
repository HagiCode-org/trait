// Lazily loaded full-text search. Shards (one per content language, see
// src/pages/data/search/[shard].json.ts) are fetched only once a search is active, at most
// once per page session. Metadata matching does not depend on this module.

import { useCallback, useEffect, useMemo, useState } from "react"

import type { ContentLanguage, SearchShardDescriptor } from "@/data/ui-constants"

export type SearchShardEntries = Record<string, string>

export type SearchStatus =
  | { state: "idle" }
  | { state: "loading"; loaded: number; total: number }
  | { state: "incomplete"; loaded: number; total: number }
  | { state: "complete"; loaded: number; total: number }

const SEARCH_RETRY_ATTEMPTS = 2
const SEARCH_RETRY_DELAY_MS = 400
export const FIRST_SEARCH_LANGUAGE: ContentLanguage = "en"

const inFlightShards = new Map<string, Promise<SearchShardEntries>>()
const loadedShards = new Map<string, SearchShardEntries>()

/** Which shards a search needs: only the filtered language when one is set, otherwise all, `en` first, then largest. */
export function selectShardsForSearch(shards: SearchShardDescriptor[], contentLanguage: ContentLanguage | "all"): SearchShardDescriptor[] {
  if (contentLanguage !== "all") {
    return shards.filter((shard) => shard.language === contentLanguage)
  }

  return [...shards].sort((left, right) => {
    if (left.language === FIRST_SEARCH_LANGUAGE) {
      return -1
    }
    if (right.language === FIRST_SEARCH_LANGUAGE) {
      return 1
    }
    return right.entryCount - left.entryCount || left.language.localeCompare(right.language)
  })
}

export function buildSearchStatus({ total, loaded, failed }: { total: number; loaded: number; failed: number }): SearchStatus {
  if (total === 0) {
    return { state: "idle" }
  }

  const pending = total - loaded - failed
  if (pending > 0) {
    return { state: "loading", loaded, total }
  }

  if (failed > 0) {
    return { state: "incomplete", loaded, total }
  }

  return { state: "complete", loaded, total }
}

/** Merges shard text per agent. Values are joined with a space, as the single-index search did. */
export function mergeShardText(shardEntries: SearchShardEntries[]): Map<string, string> {
  const merged = new Map<string, string>()

  for (const entries of shardEntries) {
    for (const [agentId, text] of Object.entries(entries)) {
      const previous = merged.get(agentId)
      merged.set(agentId, previous ? `${previous} ${text}` : text)
    }
  }

  return merged
}

export function loadSearchShard(shard: Pick<SearchShardDescriptor, "url">, fetchImpl: typeof fetch = fetch): Promise<SearchShardEntries> {
  const known = loadedShards.get(shard.url)
  if (known) {
    return Promise.resolve(known)
  }

  const pending = inFlightShards.get(shard.url)
  if (pending) {
    return pending
  }

  const request = fetchShardWithRetry(shard.url, fetchImpl).then(
    (entries) => {
      loadedShards.set(shard.url, entries)
      inFlightShards.delete(shard.url)
      return entries
    },
    (error: unknown) => {
      inFlightShards.delete(shard.url)
      throw error
    }
  )

  inFlightShards.set(shard.url, request)
  return request
}

export function evictSearchShard(url: string): void {
  loadedShards.delete(url)
  inFlightShards.delete(url)
}

async function fetchShardWithRetry(url: string, fetchImpl: typeof fetch): Promise<SearchShardEntries> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < SEARCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(url)
      if (!response.ok) {
        throw new Error(`Search shard request failed with status ${response.status}`)
      }

      const body = (await response.json()) as { entries?: SearchShardEntries }
      return body.entries ?? {}
    } catch (error) {
      lastError = error
      if (attempt < SEARCH_RETRY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, SEARCH_RETRY_DELAY_MS))
      }
    }
  }

  throw lastError
}

/**
 * Starts shard loading when `active` (a non-empty trimmed query) is true. Returns the merged
 * full text available so far, a status for the search field, and `retry` for failed shards.
 */
export function useSearchIndex({
  active,
  contentLanguage,
  shards,
}: {
  active: boolean
  contentLanguage: ContentLanguage | "all"
  shards: SearchShardDescriptor[]
}): { fullText: ReadonlyMap<string, string>; status: SearchStatus; retry: () => void } {
  const required = useMemo(() => (active ? selectShardsForSearch(shards, contentLanguage) : []), [active, contentLanguage, shards])
  // Bumped when a shard settles, to re-render; the loaded shards themselves live in the module cache.
  const [, setRevision] = useState(0)
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set())
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    for (const shard of required) {
      if (loadedShards.has(shard.url)) {
        continue
      }

      loadSearchShard(shard).then(
        () => {
          if (!cancelled) {
            setRevision((value) => value + 1)
          }
        },
        () => {
          if (!cancelled) {
            setFailedUrls((previous) => new Set(previous).add(shard.url))
          }
        }
      )
    }

    return () => {
      cancelled = true
    }
  }, [required, retryNonce])

  // Recomputed on every render: the merge is cheap and the inputs are the cache and `revision`.
  const fullText = mergeShardText(
    required.flatMap((shard) => {
      const entries = loadedShards.get(shard.url)
      return entries ? [entries] : []
    })
  )

  const loaded = required.filter((shard) => loadedShards.has(shard.url)).length
  const failed = required.filter((shard) => failedUrls.has(shard.url) && !loadedShards.has(shard.url)).length
  const status = buildSearchStatus({ total: required.length, loaded, failed })

  const retry = useCallback(() => {
    for (const shard of required) {
      if (failedUrls.has(shard.url)) {
        evictSearchShard(shard.url)
      }
    }
    setFailedUrls(new Set())
    setRetryNonce((value) => value + 1)
  }, [failedUrls, required])

  return { fullText, status, retry }
}

/** Test helper: drops every cached shard and in-flight request. */
export function clearSearchShardCache(): void {
  loadedShards.clear()
  inFlightShards.clear()
}
