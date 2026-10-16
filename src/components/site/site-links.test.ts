import { describe, expect, it } from "vitest"

import { enMessages } from "@/i18n/locales/en"
import { getHeaderNavigationLinks, getSiteLinkRel, getSiteLinkTarget, isFirstPartyHref } from "./SiteHeaderLinks"

describe("trait header links", () => {
  it("keeps only the site-specific destinations in the header", () => {
    const links = getHeaderNavigationLinks(enMessages)

    expect(links.map((link) => link.href)).toEqual([
      "https://docs.hagicode.com/",
      "https://hagicode.com",
      "https://soul.hagicode.com",
      "https://discord.gg/qY662sJK",
    ])
    expect(links.map((link) => link.id)).toEqual(["docs", "website", "soul", "discord"])
  })

  it("opens every header destination in a new tab with a rel chosen by destination class", () => {
    const links = getHeaderNavigationLinks(enMessages)

    expect(links.map((link) => getSiteLinkTarget(link))).toEqual(["_blank", "_blank", "_blank", "_blank"])
    expect(Object.fromEntries(links.map((link) => [link.id, getSiteLinkRel(link)]))).toEqual({
      docs: "noopener",
      website: "noopener",
      soul: "noopener",
      discord: "noopener noreferrer",
    })
  })

  it("gives first-party header destinations the referring origin", () => {
    const [docs] = getHeaderNavigationLinks(enMessages)

    if (!docs) throw new Error("Expected a site header link.")

    expect(getSiteLinkRel(docs)).toBe("noopener")
    expect(getSiteLinkRel(docs)).not.toContain("noreferrer")
  })

  it("leaves same-tab links without a policy rel", () => {
    expect(getSiteLinkRel({ href: "https://hagicode.com", openInNewTab: false })).toBeUndefined()
  })

  it.each([
    "https://docs.hagicode.com/",
    "https://hagicode.com",
    "https://HAGICODE.com/",
    "https://github.com/HagiCode-org/site",
    "/index-catalog.json",
  ])("classifies %s as first-party", (href) => {
    expect(isFirstPartyHref(href)).toBe(true)
  })

  it.each([
    "https://discord.gg/qY662sJK",
    "https://hagicode.com.evil.example/",
    "https://nothagicode.com/",
    "https://example.com/hagicode.com",
    "https://github.com/HagiCode-org-fake/site",
    "//evil.example/hagicode.com",
  ])("classifies look-alike or foreign host %s as third-party", (href) => {
    expect(isFirstPartyHref(href)).toBe(false)
    expect(getSiteLinkRel({ href, openInNewTab: true })).toBe("noopener noreferrer")
  })
})
