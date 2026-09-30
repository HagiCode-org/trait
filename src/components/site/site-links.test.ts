import { describe, expect, it } from "vitest"

import { enMessages } from "@/i18n/locales/en"
import { getHeaderNavigationLinks, getSiteLinkRel, getSiteLinkTarget } from "./SiteHeaderLinks"

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

  it("marks external header destinations with safe new-tab metadata", () => {
    const [link] = getHeaderNavigationLinks(enMessages)

    if (!link) throw new Error("Expected a site header link.")

    expect(getSiteLinkTarget(link)).toBe("_blank")
    expect(getSiteLinkRel(link)).toBe("noopener noreferrer")
  })
})
