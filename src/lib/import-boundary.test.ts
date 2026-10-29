import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// Client modules must not reach the generated catalog: no browser chunk may contain the
// snapshot. This reads import specifiers, so it fails on any new static, dynamic or
// re-export import of a server-only module. Test files are excluded because they never ship.

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

const serverOnlyModules = ["@/data/trait-catalog", "@/lib/catalog-loader"]

const clientRoots = [
  "components",
  "features",
  "i18n",
  "lib/route-projection.ts",
  "lib/search-index.ts",
  "lib/agent-detail-data.ts",
  "lib/featured-selection.ts",
]

describe("client import boundary", () => {
  it("keeps server-only catalog modules out of every client module", () => {
    const offenders: string[] = []

    for (const entry of clientRoots) {
      for (const file of listSourceFiles(path.join(srcRoot, entry))) {
        const source = readFileSync(file, "utf8")
        for (const specifier of readImportSpecifiers(source)) {
          if (serverOnlyModules.includes(specifier)) {
            offenders.push(`${path.relative(srcRoot, file)} imports ${specifier}`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it("finds files in every client root, so the scan is not vacuous", () => {
    const scanned = clientRoots.flatMap((entry) => listSourceFiles(path.join(srcRoot, entry)))

    expect(scanned.length).toBeGreaterThan(20)
    expect(scanned.some((file) => file.endsWith(path.join("components", "home", "HomePageShell.tsx")))).toBe(true)
    expect(scanned.some((file) => file.endsWith(path.join("lib", "route-projection.ts")))).toBe(true)
  })
})

function listSourceFiles(target: string): string[] {
  const stats = statSync(target, { throwIfNoEntry: false })
  if (!stats) {
    return []
  }

  if (stats.isFile()) {
    return isClientSource(target) ? [target] : []
  }

  return readdirSync(target).flatMap((name) => listSourceFiles(path.join(target, name)))
}

function isClientSource(file: string) {
  return /\.(ts|tsx|astro|js|mjs)$/.test(file) && !/\.test\.[a-z]+$/.test(file)
}

function readImportSpecifiers(source: string): string[] {
  const specifiers: string[] = []
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  ]

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specifiers.push(match[1])
    }
  }

  return specifiers
}
