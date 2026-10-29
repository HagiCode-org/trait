// Client-side loader for per-entry JSON (dist/data/agents/<agentId>.json). The listing drawer
// uses it to fetch an article body on demand. Results are cached per page session; a failed
// request is evicted so that a retry requests the entry again.

import { useCallback, useEffect, useState } from "react"

import type { AgentDetailPayload } from "@/data/ui-constants"

const ENTRY_RETRY_ATTEMPTS = 2
const ENTRY_RETRY_DELAY_MS = 400

const inFlight = new Map<string, Promise<AgentDetailPayload>>()
const resolved = new Map<string, AgentDetailPayload>()

export function entryPayloadUrl(agentId: string): string {
  return `/data/agents/${encodeURIComponent(agentId)}.json`
}

export function loadAgentDetail(agentId: string, fetchImpl: typeof fetch = fetch): Promise<AgentDetailPayload> {
  const known = resolved.get(agentId)
  if (known) {
    return Promise.resolve(known)
  }

  const pending = inFlight.get(agentId)
  if (pending) {
    return pending
  }

  const request = fetchEntryWithRetry(agentId, fetchImpl).then(
    (payload) => {
      resolved.set(agentId, payload)
      inFlight.delete(agentId)
      return payload
    },
    (error: unknown) => {
      inFlight.delete(agentId)
      throw error
    }
  )

  inFlight.set(agentId, request)
  return request
}

/** Forgets a cached result so the next load requests the entry again. */
export function evictAgentDetail(agentId: string): void {
  resolved.delete(agentId)
  inFlight.delete(agentId)
}

async function fetchEntryWithRetry(agentId: string, fetchImpl: typeof fetch): Promise<AgentDetailPayload> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < ENTRY_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(entryPayloadUrl(agentId))
      if (!response.ok) {
        throw new Error(`Entry request failed with status ${response.status}`)
      }

      return (await response.json()) as AgentDetailPayload
    } catch (error) {
      lastError = error
      if (attempt < ENTRY_RETRY_ATTEMPTS - 1) {
        await delay(ENTRY_RETRY_DELAY_MS)
      }
    }
  }

  throw lastError
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type AgentDetailLoadState =
  | { status: "idle"; payload: null }
  | { status: "loading"; payload: null }
  | { status: "ready"; payload: AgentDetailPayload }
  | { status: "failed"; payload: null }

type TrackedLoad = { agentId: string | null; state: AgentDetailLoadState }

/**
 * Loads the entry for `agentId` when it is set. Each settled load is tagged with its agent id, so a
 * state left over from a previous agent reads as the current agent's initial state, never as its content.
 * `retry` evicts the failed result and requests the entry again.
 */
export function useAgentDetail(agentId: string | null): { state: AgentDetailLoadState; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [tracked, setTracked] = useState<TrackedLoad>({ agentId: null, state: { status: "idle", payload: null } })

  useEffect(() => {
    if (!agentId || resolved.has(agentId)) {
      return undefined
    }

    let cancelled = false

    loadAgentDetail(agentId).then(
      (payload) => {
        if (!cancelled) {
          setTracked({ agentId, state: { status: "ready", payload } })
        }
      },
      () => {
        if (!cancelled) {
          setTracked({ agentId, state: { status: "failed", payload: null } })
        }
      }
    )

    return () => {
      cancelled = true
    }
  }, [agentId, attempt])

  const retry = useCallback(() => {
    if (agentId) {
      evictAgentDetail(agentId)
      setTracked({ agentId: null, state: { status: "idle", payload: null } })
      setAttempt((value) => value + 1)
    }
  }, [agentId])

  const state = tracked.agentId === agentId ? tracked.state : initialState(agentId)
  return { state, retry }
}

function initialState(agentId: string | null): AgentDetailLoadState {
  if (!agentId) {
    return { status: "idle", payload: null }
  }

  const cached = resolved.get(agentId)
  return cached ? { status: "ready", payload: cached } : { status: "loading", payload: null }
}

/** Test helper: drops every cached entry and in-flight request. */
export function clearAgentDetailCache(): void {
  resolved.clear()
  inFlight.clear()
}
