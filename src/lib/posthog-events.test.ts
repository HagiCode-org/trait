import { afterEach, describe, expect, it, vi, type Mock } from "vitest"

import { SITE_POSTHOG_EVENTS, SITE_EVENT_STRING_MAX_LENGTH, captureSiteEvent } from "@/lib/posthog-events"

type FakePostHog = {
  __loaded?: boolean
  capture: Mock<(event: string, properties?: Record<string, unknown>) => unknown>
  has_opted_out_capturing: Mock<() => boolean>
}

function loadedPostHog(optedOut = false): FakePostHog {
  return {
    __loaded: true,
    capture: vi.fn(),
    has_opted_out_capturing: vi.fn(() => optedOut),
  }
}

const FORBIDDEN_SUPER_KEYS = ["site_id", "site_framework", "hagilight_version", "locale", "page_type"]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("captureSiteEvent", () => {
  it("sends nothing for an event name outside the site table", () => {
    const posthog = loadedPostHog()

    captureSiteEvent("not_in_table", { agent_id: "architect" }, { posthog })

    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it("drops keys that are not in the event allowlist", () => {
    const posthog = loadedPostHog()

    captureSiteEvent("agent_link_copied", { agent_id: "architect", query: "secret search", href: "https://x.test/a" }, { posthog })

    expect(posthog.capture).toHaveBeenCalledWith("agent_link_copied", { agent_id: "architect" })
  })

  it("drops non-primitive values and out-of-kind values", () => {
    const posthog = loadedPostHog()

    captureSiteEvent("agent_link_copied", { agent_id: { id: "architect" } }, { posthog })
    captureSiteEvent("agent_link_copied", { agent_id: ["architect"] }, { posthog })
    captureSiteEvent("agent_link_copied", { agent_id: null }, { posthog })
    captureSiteEvent("catalog_searched", { results_count: 1.5 }, { posthog })
    captureSiteEvent("catalog_searched", { results_count: -1 }, { posthog })
    captureSiteEvent("catalog_searched", { results_count: "3" }, { posthog })

    expect(posthog.capture).toHaveBeenCalledTimes(6)
    for (const [, properties] of posthog.capture.mock.calls) {
      expect(properties).toEqual({})
    }
  })

  it("caps a string value at 128 characters", () => {
    const posthog = loadedPostHog()
    const long = "a".repeat(SITE_EVENT_STRING_MAX_LENGTH + 40)

    captureSiteEvent("agent_link_copied", { agent_id: long }, { posthog })

    const properties = posthog.capture.mock.calls[0][1] as { agent_id: string }
    expect(properties.agent_id).toHaveLength(SITE_EVENT_STRING_MAX_LENGTH)
  })

  it("drops super-property keys supplied by a caller", () => {
    const posthog = loadedPostHog()
    const input = Object.fromEntries(FORBIDDEN_SUPER_KEYS.map((key) => [key, "value"]))

    captureSiteEvent("agent_link_copied", { ...input, agent_id: "architect" }, { posthog })

    expect(posthog.capture).toHaveBeenCalledWith("agent_link_copied", { agent_id: "architect" })
  })

  it("sends nothing and does not throw when window.posthog is undefined", () => {
    vi.stubGlobal("window", {})

    expect(() => captureSiteEvent("agent_link_copied", { agent_id: "architect" })).not.toThrow()
  })

  it("sends nothing when there is no window at all", () => {
    expect(() => captureSiteEvent("agent_link_copied", { agent_id: "architect" })).not.toThrow()
  })

  it("reads window.posthog when no posthog option is given", () => {
    const posthog = loadedPostHog()
    vi.stubGlobal("window", { posthog })

    captureSiteEvent("agent_link_copied", { agent_id: "architect" })

    expect(posthog.capture).toHaveBeenCalledWith("agent_link_copied", { agent_id: "architect" })
  })

  it("queues on the stub without calling has_opted_out_capturing when __loaded is not true", () => {
    const posthog: FakePostHog = {
      capture: vi.fn(),
      has_opted_out_capturing: vi.fn(() => false),
    }

    captureSiteEvent("agent_link_copied", { agent_id: "architect" }, { posthog })

    expect(posthog.capture).toHaveBeenCalledWith("agent_link_copied", { agent_id: "architect" })
    expect(posthog.has_opted_out_capturing).not.toHaveBeenCalled()
  })

  it("sends nothing when the visitor has opted out", () => {
    const posthog = loadedPostHog(true)

    captureSiteEvent("agent_link_copied", { agent_id: "architect" }, { posthog })

    expect(posthog.has_opted_out_capturing).toHaveBeenCalledTimes(1)
    expect(posthog.capture).not.toHaveBeenCalled()
  })

  it("does not throw when capture throws", () => {
    const posthog = loadedPostHog()
    posthog.capture.mockImplementation(() => {
      throw new Error("network down")
    })

    expect(() => captureSiteEvent("agent_link_copied", { agent_id: "architect" }, { posthog })).not.toThrow()
  })

  it("sends nothing when the isAllowed gate says no", () => {
    const posthog = loadedPostHog()

    captureSiteEvent("agent_link_copied", { agent_id: "architect" }, { posthog, isAllowed: () => false })

    expect(posthog.capture).not.toHaveBeenCalled()
  })
})

describe("site event table", () => {
  it("names every event snake_case with the object first and no forbidden super-property key", () => {
    for (const [name, properties] of Object.entries(SITE_POSTHOG_EVENTS)) {
      expect(name).toMatch(/^[a-z]+(_[a-z]+)+$/)
      for (const key of Object.keys(properties)) {
        expect(FORBIDDEN_SUPER_KEYS).not.toContain(key)
      }
    }
  })

  it("sends exactly the allowlisted property set for every event on a representative input", () => {
    const posthog = loadedPostHog()
    const representative = {
      agent_id: "architect",
      results_count: 7,
      href: "https://trait.hagicode.com/agents/architect/zh-CN?ref=secret#top",
      url: "https://trait.hagicode.com/agents/architect/",
      query: "free text search term",
      text: "# Copied markdown body",
      ...Object.fromEntries(FORBIDDEN_SUPER_KEYS.map((key) => [key, "value"])),
    }

    for (const [name, properties] of Object.entries(SITE_POSTHOG_EVENTS)) {
      captureSiteEvent(name, representative, { posthog })

      const [sentName, sent] = posthog.capture.mock.calls.at(-1)!
      expect(sentName).toBe(name)
      expect(Object.keys(sent ?? {}).sort()).toEqual(Object.keys(properties).sort())
      expect(JSON.stringify(sent)).not.toMatch(/https?:|secret|free text|Copied markdown/)
    }
  })
})
