// Size budgets for the built site. Runs after `astro build`, next to check-seo.mjs.
//
// Measures gzip size of the HTML of the homepage, the listing page and one detail page, and of
// the JavaScript each of those pages requests. The requested set comes from script tags,
// modulepreload links and astro-island component/renderer URLs, followed through static imports.
// Search shards under dist/data/search are reported separately and are not part of any route total.
//
// A ceiling is changed only with a written reason in docs/catalog-payload-sizes.md.

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import zlib from "node:zlib"
import { fileURLToPath, pathToFileURL } from "node:url"

const KB = 1024

// Gzip ceilings in bytes. KB is 1024 bytes.
export const CEILINGS = {
  routeProjectionJs: 50 * KB,
  routeJs: 300 * KB,
  homeHtml: 350 * KB,
  listingHtml: 450 * KB,
  detailHtml: 100 * KB,
}

const ROUTE_PROJECTION_CHUNK = /^route-projection\..*\.js$/

export function gzipSize(buffer) {
  return zlib.gzipSync(buffer).length
}

/** The asset URLs an HTML page requests directly. */
export function extractAssetReferences(html) {
  const references = []

  for (const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    references.push(match[1])
  }

  for (const match of html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"/g)) {
    references.push(match[1])
  }

  for (const match of html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="modulepreload"/g)) {
    references.push(match[1])
  }

  for (const match of html.matchAll(/\b(?:component-url|renderer-url)="([^"]+)"/g)) {
    references.push(match[1])
  }

  // External hosts are not part of this build, so they are not measured.
  return [...new Set(references)].filter((reference) => !isExternalReference(reference))
}

function isExternalReference(reference) {
  return /^[a-z][a-z0-9+.-]*:/i.test(reference) || reference.startsWith("//")
}

/** Static import specifiers of a JavaScript module. Dynamic import(...) is deliberately not followed. */
export function extractStaticImports(source) {
  const specifiers = []

  for (const match of source.matchAll(/\bfrom\s*["']([^"']+)["']/g)) {
    specifiers.push(match[1])
  }

  for (const match of source.matchAll(/\bimport\s*["']([^"']+)["']/g)) {
    specifiers.push(match[1])
  }

  return [...new Set(specifiers)]
}

function toFilePath(distDir, reference, fromFile) {
  const cleanReference = reference.split(/[?#]/)[0]

  if (cleanReference.startsWith("/")) {
    return path.join(distDir, cleanReference)
  }

  return path.resolve(path.dirname(fromFile), cleanReference)
}

class MissingAssetError extends Error {
  constructor(file, referencedBy) {
    super(`Missing file ${file} referenced by ${referencedBy}`)
    this.name = "MissingAssetError"
    this.file = file
    this.referencedBy = referencedBy
  }
}

/** The JavaScript a page requests, following static imports. Each file is counted once. */
export async function collectRouteJavaScript(distDir, htmlFile) {
  const html = await readFile(htmlFile, "utf8")
  const queue = extractAssetReferences(html).map((reference) => ({
    filePath: toFilePath(distDir, reference, htmlFile),
    referencedBy: path.relative(distDir, htmlFile),
  }))
  const seen = new Map()

  while (queue.length > 0) {
    const current = queue.shift()
    if (seen.has(current.filePath)) {
      continue
    }

    let buffer
    try {
      buffer = await readFile(current.filePath)
    } catch {
      throw new MissingAssetError(path.relative(distDir, current.filePath), current.referencedBy)
    }

    seen.set(current.filePath, gzipSize(buffer))

    const source = buffer.toString("utf8")
    for (const specifier of extractStaticImports(source)) {
      if (specifier.startsWith(".") || specifier.startsWith("/")) {
        queue.push({
          filePath: toFilePath(distDir, specifier, current.filePath),
          referencedBy: path.relative(distDir, current.filePath),
        })
      }
    }
  }

  const files = [...seen.entries()].map(([filePath, gzip]) => ({ file: path.relative(distDir, filePath), gzip }))
  return { files, total: files.reduce((sum, entry) => sum + entry.gzip, 0) }
}

async function exists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

/** Measures one representative route. Throws MissingAssetError when its HTML or a requested file is absent. */
export async function measureRoute(distDir, { name, htmlPath }) {
  const htmlFile = path.join(distDir, htmlPath)
  if (!(await exists(htmlFile))) {
    throw new MissingAssetError(path.relative(distDir, htmlFile), name)
  }

  const html = await readFile(htmlFile)
  const js = await collectRouteJavaScript(distDir, htmlFile)

  return {
    route: name,
    htmlFile: htmlPath,
    htmlGzip: gzipSize(html),
    js,
  }
}

/** Route-projection chunks anywhere in the build, measured on their own. */
export async function measureRouteProjectionChunks(distDir) {
  const astroDir = path.join(distDir, "_astro")
  if (!(await exists(astroDir))) {
    return []
  }

  const entries = await readdir(astroDir)
  const chunks = []

  for (const entry of entries.filter((name) => ROUTE_PROJECTION_CHUNK.test(name))) {
    const buffer = await readFile(path.join(astroDir, entry))
    chunks.push({ file: `_astro/${entry}`, gzip: gzipSize(buffer) })
  }

  return chunks
}

/** Search shards under dist/data/search: raw and gzip size, reported apart from route totals. */
export async function measureSearchShards(distDir) {
  const shardDir = path.join(distDir, "data", "search")
  if (!(await exists(shardDir))) {
    return { shards: [], rawTotal: 0, gzipTotal: 0 }
  }

  const names = (await readdir(shardDir)).filter((name) => name.endsWith(".json")).sort()
  const shards = []

  for (const name of names) {
    const buffer = await readFile(path.join(shardDir, name))
    shards.push({ file: `data/search/${name}`, raw: buffer.length, gzip: gzipSize(buffer) })
  }

  return {
    shards,
    rawTotal: shards.reduce((sum, shard) => sum + shard.raw, 0),
    gzipTotal: shards.reduce((sum, shard) => sum + shard.gzip, 0),
  }
}

/** Ceiling checks over measured routes and the route-projection chunks. Each failure names route, measure, actual and ceiling. */
export function evaluateCeilings(routes, chunks, ceilings = CEILINGS) {
  const failures = []

  for (const route of routes) {
    const htmlCeiling = route.route === "home" ? ceilings.homeHtml : route.route === "listing" ? ceilings.listingHtml : ceilings.detailHtml
    if (route.htmlGzip > htmlCeiling) {
      failures.push({ route: route.route, measure: "html gzip", actual: route.htmlGzip, ceiling: htmlCeiling })
    }

    if (route.js.total > ceilings.routeJs) {
      failures.push({ route: route.route, measure: "javascript gzip (aggregate)", actual: route.js.total, ceiling: ceilings.routeJs })
    }
  }

  for (const chunk of chunks) {
    if (chunk.gzip > ceilings.routeProjectionJs) {
      failures.push({ route: chunk.file, measure: "route-projection javascript gzip", actual: chunk.gzip, ceiling: ceilings.routeProjectionJs })
    }
  }

  return failures
}

/** Runs every measurement against a built dist. Never throws for a budget or missing-file problem; it reports them. */
export async function runSizeCheck({ distDir, detailRoute, ceilings = CEILINGS }) {
  const routeSpecs = [
    { name: "home", htmlPath: "index.html" },
    { name: "listing", htmlPath: path.join("agents", "index.html") },
    { name: "detail", htmlPath: path.join("agents", detailRoute, "index.html") },
  ]

  const routes = []
  const failures = []

  for (const spec of routeSpecs) {
    try {
      routes.push(await measureRoute(distDir, spec))
    } catch (error) {
      if (error instanceof MissingAssetError) {
        failures.push({ route: spec.name, measure: "missing file", file: error.file, referencedBy: error.referencedBy })
        continue
      }
      throw error
    }
  }

  const chunks = await measureRouteProjectionChunks(distDir)
  const shardReport = await measureSearchShards(distDir)
  failures.push(...evaluateCeilings(routes, chunks, ceilings))

  return { routes, chunks, shardReport, failures }
}

export function formatReport(result) {
  const lines = ["Size budgets (gzip, KB = 1024 bytes):"]

  for (const route of result.routes) {
    lines.push(`- ${route.route}: html ${route.htmlGzip} bytes (${route.htmlFile}); javascript ${route.js.total} bytes across ${route.js.files.length} file(s)`)
  }

  if (result.chunks.length > 0) {
    lines.push("Route-projection chunks:")
    for (const chunk of result.chunks) {
      lines.push(`- ${chunk.file}: ${chunk.gzip} bytes`)
    }
  }

  lines.push("Search shards (reported separately, not counted in route totals):")
  for (const shard of result.shardReport.shards) {
    lines.push(`- ${shard.file}: raw ${shard.raw} bytes, gzip ${shard.gzip} bytes`)
  }
  lines.push(`- total: raw ${result.shardReport.rawTotal} bytes, gzip ${result.shardReport.gzipTotal} bytes`)

  if (result.failures.length > 0) {
    lines.push("Failures:")
    for (const failure of result.failures) {
      if (failure.measure === "missing file") {
        lines.push(`- ${failure.route}: missing file ${failure.file} (referenced by ${failure.referencedBy})`)
      } else {
        lines.push(`- ${failure.route}: ${failure.measure}: actual ${failure.actual} bytes > ceiling ${failure.ceiling} bytes`)
      }
    }
  } else {
    lines.push("All budgets within ceilings.")
  }

  return lines.join("\n")
}

async function main() {
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
  const projectRoot = path.resolve(scriptDirectory, "..")
  const distDir = path.join(projectRoot, "dist")
  const snapshotPath = path.join(projectRoot, "src", "data", "generated", "agent-catalog.json")
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"))
  const detailRoute = snapshot.items[0]?.agentId

  if (!detailRoute) {
    console.error("Size check: the catalog has no entries, so there is no detail route to measure.")
    process.exitCode = 1
    return
  }

  const result = await runSizeCheck({ distDir, detailRoute })
  console.log(formatReport(result))

  if (result.failures.length > 0) {
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
