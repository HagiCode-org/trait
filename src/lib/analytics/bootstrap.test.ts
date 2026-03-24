// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { bootstrapAnalytics } from "./bootstrap"
import {
  DEFAULT_51LA_ID,
  FIFTY_ONE_LA_READY_EVENT,
  FIFTY_ONE_LA_SDK_SRC,
  resolve51LAConfig,
  type FiftyOneLAWindow,
} from "./provider-51la"

describe("51LA analytics bootstrap", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    delete (window as FiftyOneLAWindow).LA
    vi.restoreAllMocks()
  })

  afterEach(() => {
    delete (window as FiftyOneLAWindow).LA
  })

  it("reuses the official-site default ID and init contract", () => {
    const config = resolve51LAConfig({ PROD: true })

    expect(config.id).toBe(DEFAULT_51LA_ID)
    expect(config.initOptions).toEqual({
      id: DEFAULT_51LA_ID,
      ck: DEFAULT_51LA_ID,
      autoTrack: true,
      hashMode: true,
      screenRecord: true,
    })
  })

  it("skips loading the SDK outside production", async () => {
    const initialized = await bootstrapAnalytics({
      env: { PROD: false },
      windowLike: window as FiftyOneLAWindow,
      documentLike: document,
    })

    expect(initialized).toBe(false)
    expect(document.getElementById("LA_COLLECT")).toBeNull()
  })

  it("loads the production SDK, initializes 51LA, and dispatches the ready event", async () => {
    const init = vi.fn()
    const readyListener = vi.fn()
    window.addEventListener(FIFTY_ONE_LA_READY_EVENT, readyListener, { once: true })

    const bootstrapPromise = bootstrapAnalytics({
      env: { PROD: true },
      windowLike: window as FiftyOneLAWindow,
      documentLike: document,
    })

    const script = document.getElementById("LA_COLLECT") as HTMLScriptElement | null
    expect(script?.getAttribute("src")).toBe(FIFTY_ONE_LA_SDK_SRC)

    ;(window as FiftyOneLAWindow).LA = { init }
    script?.dispatchEvent(new Event("load"))

    await expect(bootstrapPromise).resolves.toBe(true)
    expect(init).toHaveBeenCalledWith({
      id: DEFAULT_51LA_ID,
      ck: DEFAULT_51LA_ID,
      autoTrack: true,
      hashMode: true,
      screenRecord: true,
    })
    expect(readyListener).toHaveBeenCalledTimes(1)
  })

  it("honors env overrides for the site ID", async () => {
    const init = vi.fn()

    const bootstrapPromise = bootstrapAnalytics({
      env: {
        PROD: true,
        VITE_51LA_ID: "override-id",
        VITE_51LA_DEBUG: "1",
      },
      windowLike: window as FiftyOneLAWindow,
      documentLike: document,
    })

    const script = document.getElementById("LA_COLLECT") as HTMLScriptElement | null
    ;(window as FiftyOneLAWindow).LA = { init }
    script?.dispatchEvent(new Event("load"))

    await expect(bootstrapPromise).resolves.toBe(true)
    expect(init).toHaveBeenCalledWith({
      id: "override-id",
      ck: "override-id",
      autoTrack: true,
      hashMode: true,
      screenRecord: true,
    })
  })

  it("fails safely when the SDK script loads without exposing window.LA", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const bootstrapPromise = bootstrapAnalytics({
      env: { PROD: true },
      windowLike: window as FiftyOneLAWindow,
      documentLike: document,
    })

    const script = document.getElementById("LA_COLLECT") as HTMLScriptElement | null
    script?.dispatchEvent(new Event("load"))

    await expect(bootstrapPromise).resolves.toBe(false)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("fails safely when the SDK request errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const bootstrapPromise = bootstrapAnalytics({
      env: { PROD: true },
      windowLike: window as FiftyOneLAWindow,
      documentLike: document,
    })

    const script = document.getElementById("LA_COLLECT") as HTMLScriptElement | null
    script?.dispatchEvent(new Event("error"))

    await expect(bootstrapPromise).resolves.toBe(false)
    expect(warnSpy).toHaveBeenCalledWith("[51LA Analytics] Failed to load SDK script")
  })
})
