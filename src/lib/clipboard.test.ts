// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { copyText } from "@/lib/clipboard"

describe("clipboard", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("prefers the Clipboard API when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    await expect(copyText("alpha")).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith("alpha")
  })

  it("falls back to document.execCommand when the Clipboard API is unavailable", async () => {
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    })

    await expect(copyText("fallback text")).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(document.querySelector("textarea")).toBeNull()
  })

  it("returns false when both Clipboard API and fallback copy fail", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"))
    const execCommand = vi.fn().mockReturnValue(false)
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    })

    await expect(copyText("blocked")).resolves.toBe(false)
    expect(writeText).toHaveBeenCalledWith("blocked")
    expect(execCommand).toHaveBeenCalledWith("copy")
  })
})
