import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { randomBytes } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  CEILINGS,
  collectRouteJavaScript,
  extractAssetReferences,
  extractStaticImports,
  formatReport,
  runSizeCheck,
} from "./check-size-budgets.mjs"

let distDir

beforeEach(async () => {
  distDir = await mkdtemp(path.join(os.tmpdir(), "trait-size-check-"))
})

afterEach(async () => {
  await rm(distDir, { recursive: true, force: true })
})

async function writeDistFile(relativePath, content) {
  const target = path.join(distDir, relativePath)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, content)
}

/** A minimal build: home, listing and one detail page, each requesting its own island chunk. */
async function writeFixtureSite({ homeExtra = "", detailId = "agent-one" } = {}) {
  await writeDistFile(
    "index.html",
    `<html><head><script type="module" src="/_astro/home.js"></script></head><body>${homeExtra}<astro-island component-url="/_astro/HomeShell.js" renderer-url="/_astro/renderer.js"></astro-island></body></html>`
  )
  await writeDistFile(
    "agents/index.html",
    `<html><head><link rel="modulepreload" href="/_astro/listing.js"></head><body><astro-island component-url="/_astro/ListingShell.js"></astro-island></body></html>`
  )
  await writeDistFile(
    `agents/${detailId}/index.html`,
    `<html><body><h1>Agent</h1><astro-island component-url="/_astro/DetailShell.js"></astro-island></body></html>`
  )

  await writeDistFile("_astro/home.js", `import"./shared.js";from"./shared.js";const lazy=()=>import("./lazy.js");export{lazy}`)
  await writeDistFile("_astro/shared.js", "export const shared = 1;")
  await writeDistFile("_astro/lazy.js", "export const lazy = 2;")
  await writeDistFile("_astro/HomeShell.js", "export default 1;")
  await writeDistFile("_astro/renderer.js", "export default 1;")
  await writeDistFile("_astro/listing.js", "export const listing = 1;")
  await writeDistFile("_astro/ListingShell.js", "export default 1;")
  await writeDistFile("_astro/DetailShell.js", "export default 1;")
}

describe("asset reference extraction", () => {
  it("collects script sources, modulepreload hrefs and astro-island URLs", () => {
    const html = [
      '<script type="module" src="/_astro/a.js"></script>',
      '<link rel="modulepreload" href="/_astro/b.js">',
      '<astro-island component-url="/_astro/c.js" renderer-url="/_astro/d.js"></astro-island>',
    ].join("")

    expect(extractAssetReferences(html)).toEqual(["/_astro/a.js", "/_astro/b.js", "/_astro/c.js", "/_astro/d.js"])
  })

  it("ignores external script hosts, which are not part of the build", () => {
    const html = '<script src="https://sdk.example.com/analytics.js"></script><script src="//cdn.example.com/x.js"></script><script src="/_astro/own.js"></script>'

    expect(extractAssetReferences(html)).toEqual(["/_astro/own.js"])
  })

  it("follows static imports and never dynamic import() calls", () => {
    const source = 'import"./x.js";import{a as b}from"./y.js";const c=()=>import("./z.js");export{b}'

    expect(extractStaticImports(source).sort()).toEqual(["./x.js", "./y.js"])
  })
})

describe("route javascript resolution", () => {
  it("follows static imports from requested chunks and counts each file once", async () => {
    await writeFixtureSite()

    const result = await collectRouteJavaScript(distDir, path.join(distDir, "index.html"))
    const files = result.files.map((entry) => entry.file).sort()

    expect(files).toEqual(["_astro/HomeShell.js", "_astro/home.js", "_astro/renderer.js", "_astro/shared.js"].sort())
    expect(files).not.toContain("_astro/lazy.js")
    expect(result.total).toBe(result.files.reduce((sum, entry) => sum + entry.gzip, 0))
  })
})

describe("size check run", () => {
  it("passes a small build within every ceiling and prints a route summary", async () => {
    await writeFixtureSite()

    const result = await runSizeCheck({ distDir, detailRoute: "agent-one" })

    expect(result.failures).toEqual([])
    expect(result.routes.map((route) => route.route)).toEqual(["home", "listing", "detail"])
    expect(formatReport(result)).toContain("All budgets within ceilings.")
  })

  it("fails with route, measure, actual and ceiling when a page exceeds its ceiling", async () => {
    await writeFixtureSite({ homeExtra: `<p>${randomBytes(4096).toString("hex")}</p>` })

    const result = await runSizeCheck({ distDir, detailRoute: "agent-one", ceilings: { ...CEILINGS, homeHtml: 512 } })
    const failure = result.failures.find((entry) => entry.route === "home" && entry.measure === "html gzip")

    expect(failure).toBeDefined()
    expect(failure.ceiling).toBe(512)
    expect(failure.actual).toBeGreaterThan(512)
    expect(formatReport(result)).toContain("home: html gzip: actual")
  })

  it("fails and names the file when a requested script is missing", async () => {
    await writeFixtureSite()
    await writeDistFile("index.html", '<html><head><script type="module" src="/_astro/gone.js"></script></head></html>')

    const result = await runSizeCheck({ distDir, detailRoute: "agent-one" })
    const failure = result.failures.find((entry) => entry.measure === "missing file")

    expect(failure).toMatchObject({ route: "home", file: "_astro/gone.js" })
    expect(formatReport(result)).toContain("missing file _astro/gone.js")
  })

  it("fails and names the page when a representative route's HTML is missing", async () => {
    await writeFixtureSite({ detailId: "agent-one" })

    const result = await runSizeCheck({ distDir, detailRoute: "not-built" })

    expect(result.failures).toContainEqual(
      expect.objectContaining({ route: "detail", measure: "missing file", file: "agents/not-built/index.html" })
    )
  })

  it("fails on a route-projection chunk over its ceiling, naming the chunk", async () => {
    await writeFixtureSite()
    await writeDistFile("_astro/route-projection.abc123.js", randomBytes(8192).toString("hex"))

    const result = await runSizeCheck({ distDir, detailRoute: "agent-one", ceilings: { ...CEILINGS, routeProjectionJs: 1024 } })

    expect(result.failures).toContainEqual(
      expect.objectContaining({ route: "_astro/route-projection.abc123.js", measure: "route-projection javascript gzip", ceiling: 1024 })
    )
  })

  it("reports search shards in their own section and leaves route totals unchanged", async () => {
    await writeFixtureSite()
    const before = await runSizeCheck({ distDir, detailRoute: "agent-one" })
    await writeDistFile("data/search/en.0123456789.json", JSON.stringify({ entries: { a: randomBytes(20000).toString("hex") } }))

    const after = await runSizeCheck({ distDir, detailRoute: "agent-one" })
    const report = formatReport(after)

    expect(after.routes.map((route) => route.js.total)).toEqual(before.routes.map((route) => route.js.total))
    expect(after.routes.flatMap((route) => route.js.files.map((entry) => entry.file))).not.toContain("data/search/en.0123456789.json")
    expect(after.shardReport.shards.map((shard) => shard.file)).toEqual(["data/search/en.0123456789.json"])
    expect(report).toContain("Search shards (reported separately, not counted in route totals):")
    expect(report).toContain("data/search/en.0123456789.json")
  })
})
