import fs from "node:fs/promises"
import path from "node:path"

import snapshotData from "../src/data/generated/agent-catalog.json" with { type: "json" }

const distDir = path.resolve("dist")
const expectedRoutes = [
  "/",
  "/agents/",
  ...snapshotData.items.flatMap((item) =>
    item.availableLanguages.map((language) =>
      language === item.defaultLanguage ? `/agents/${item.agentId}/` : `/agents/${item.agentId}/${language}/`
    )
  ),
]

const failures = []

for (const route of expectedRoutes) {
  const htmlPath = resolveHtmlPath(route)
  const html = await fs.readFile(htmlPath, "utf8")

  check(html.includes("<title>"), route, "missing <title>")
  check(/<meta\s+name="description"\s+content="[^"]+"/i.test(html), route, "missing meta description")
  check(/<link\s+rel="canonical"\s+href="[^"]+"/i.test(html), route, "missing canonical link")
  check((html.match(/<h1\b/gi) ?? []).length === 1, route, "expected exactly one <h1>")
  check(/<script\s+type="application\/ld\+json">/i.test(html), route, "missing JSON-LD")
}

const sitemap = await fs.readFile(path.join(distDir, "sitemap.xml"), "utf8")
for (const route of expectedRoutes) {
  const url = new URL(route, "https://trait.hagicode.com").toString()
  check(sitemap.includes(`<loc>${url}</loc>`), route, "missing sitemap entry")
}

const robots = await fs.readFile(path.join(distDir, "robots.txt"), "utf8")
check(robots.includes("Sitemap: https://trait.hagicode.com/sitemap.xml"), "/robots.txt", "missing sitemap reference")

if (failures.length > 0) {
  console.error(`SEO validation failed:\n${failures.map((entry) => `- ${entry}`).join("\n")}`)
  process.exit(1)
}

console.log(`SEO validation passed for ${expectedRoutes.length} routes.`)

function resolveHtmlPath(route) {
  if (route === "/") {
    return path.join(distDir, "index.html")
  }

  return path.join(distDir, route.replace(/^\//, ""), "index.html")
}

function check(condition, route, message) {
  if (!condition) {
    failures.push(`${route}: ${message}`)
  }
}
