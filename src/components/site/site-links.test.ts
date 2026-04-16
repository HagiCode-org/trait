import { describe, expect, it } from "vitest"

import { enMessages } from "@/i18n/locales/en"
import { zhCnMessages } from "@/i18n/locales/zh-CN"
import { getFooterLinkSections } from "./site-links"

describe("trait footer site links", () => {
  it("merges snapshot links after local related links and excludes the current site", () => {
    const sections = getFooterLinkSections(enMessages, "en")
    const related = sections.find((section) => section.id === "related")

    expect(related?.links.map((link) => link.label).slice(0, 3)).toEqual(["HagiCode Docs", "HagiCode 主站", "Soul Builder"])
    expect(related?.links[0]).toMatchObject({
      description: "使用指南",
    })
    expect(related?.links.some((link) => link.href === "https://trait.hagicode.com/")).toBe(false)
    expect(related?.links.some((link) => link.href === "https://builder.hagicode.com/")).toBe(true)
  })

  it("suppresses duplicate docs and website destinations from the bundled snapshot", () => {
    const sections = getFooterLinkSections(zhCnMessages, "zh-CN")
    const related = sections.find((section) => section.id === "related")
    const hrefs = related?.links.map((link) => link.href) ?? []

    expect(hrefs.filter((href) => href === "https://docs.hagicode.com/")).toHaveLength(1)
    expect(hrefs.filter((href) => href === "https://hagicode.com")).toHaveLength(1)
  })

  it("keeps Steam as a repo-owned community link with safe external metadata", () => {
    const sections = getFooterLinkSections(enMessages, "en")
    const community = sections.find((section) => section.id === "community")
    const steamLink = community?.links.find((link) => link.id === "steam")

    expect(steamLink).toMatchObject({
      label: "Steam",
      href: "https://store.steampowered.com/app/4625540/Hagicode/",
      external: true,
      openInNewTab: true,
    })
  })
})
