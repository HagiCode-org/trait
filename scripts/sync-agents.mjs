import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { sourceManifest } from "./agent-sources.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const outputPath = path.join(repoRoot, "src/data/generated/agent-catalog.json")

const TYPE_PATTERNS = [
  ["reviewer", /reviewer$/],
  ["build-resolver", /(build|error)-resolver$/],
  ["chief-of-staff", /chief-of-staff$/],
  ["docs-lookup", /docs-lookup$/],
  ["doc-updater", /doc-updater$/],
  ["e2e-runner", /e2e-runner$/],
  ["harness-optimizer", /harness-optimizer$/],
  ["loop-operator", /loop-operator$/],
  ["refactor-cleaner", /refactor-cleaner$/],
  ["tdd-guide", /tdd-guide$/],
  ["planner", /planner$/],
  ["architect", /architect$/],
]

export async function buildAgentCatalogSnapshot({
  manifest = sourceManifest,
  repoRootPath = repoRoot,
  startedAt = new Date().toISOString(),
} = {}) {
  const discoveredCatalog = new Map()

  await verifySourceRoots(manifest.sources, repoRootPath)

  const items = []
  for (const source of manifest.sources) {
    const entries = await discoverCanonicalAgentEntries(source, repoRootPath)
    discoveredCatalog.set(source.id, entries)

    const variantDirectories = await resolveVariantDirectories(source, repoRootPath)
    for (const entry of entries) {
      const item = await buildCatalogItem({
        source,
        entry,
        repoRootPath,
        variantDirectories,
      })

      if (item) {
        items.push(item)
      }
    }
  }

  const normalizedItems = items.sort((left, right) => left.name.localeCompare(right.name))
  const languageIndex = buildLanguageIndex(normalizedItems)
  const sources = manifest.sources.map((source) =>
    buildSourceSnapshot({
      source,
      items: normalizedItems,
      trackedAgents: discoveredCatalog.get(source.id)?.length ?? 0,
      lastSyncedAt: startedAt,
    })
  )

  return {
    version: 1,
    lastSyncedAt: startedAt,
    languageIndex,
    sources,
    items: normalizedItems,
  }
}

async function main() {
  const snapshot = await buildAgentCatalogSnapshot()

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8")

  console.log(`Synced ${snapshot.items.length} agents from local submodules to ${path.relative(repoRoot, outputPath)}`)
  console.log(`lastSyncedAt=${snapshot.lastSyncedAt}`)
}

async function verifySourceRoots(sources, repoRootPath) {
  await Promise.all(
    sources.map(async (source) => {
      const rootPath = resolveSourceRoot(source, repoRootPath)
      try {
        const stat = await fs.stat(rootPath)
        if (!stat.isDirectory()) {
          throw new Error("Source root is not a directory")
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(
          `Local source is not ready for ${source.id}: ${path.relative(repoRootPath, rootPath)} (${message}). Run \`npm run sync:agents:update-source\` first.`
        )
      }
    })
  )
}

export async function discoverCanonicalAgentEntries(source, repoRootPath = repoRoot) {
  const discovery = source.discovery
  const canonicalRoot = path.join(resolveSourceRoot(source, repoRootPath), discovery.canonical.directory)

  let entries
  try {
    entries = await fs.readdir(canonicalRoot, { withFileTypes: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Canonical discovery path is unavailable for ${source.id}: ${path.relative(repoRootPath, canonicalRoot)} (${message}).`
    )
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith(discovery.canonical.extension))
    .filter((fileName) => !isExcludedPath(fileName, discovery.canonical.exclude ?? []))
    .map((fileName) => ({
      agentId: deriveCanonicalAgentId(fileName),
      fileName,
      canonicalPath: toPosixPath(path.join(discovery.canonical.directory, fileName)),
    }))
    .sort((left, right) => left.agentId.localeCompare(right.agentId))
}

async function resolveVariantDirectories(source, repoRootPath) {
  const rootPath = resolveSourceRoot(source, repoRootPath)
  const directories = new Map()

  for (const [language, directory] of Object.entries(source.discovery.variants)) {
    const absolutePath = path.join(rootPath, directory)
    const available = await isDirectory(absolutePath)
    directories.set(language, { directory, available })
  }

  return directories
}

async function buildCatalogItem({ source, entry, repoRootPath, variantDirectories }) {
  const variants = {}

  for (const [language, variantDirectory] of variantDirectories.entries()) {
    if (!variantDirectory.available) {
      continue
    }

    const sourcePath = toPosixPath(path.join(variantDirectory.directory, entry.fileName))
    const result = await readVariant({
      source,
      agentId: entry.agentId,
      language,
      sourcePath,
      repoRootPath,
    })

    if (!result.ok) {
      continue
    }

    variants[language] = result.variant
  }

  const availableLanguages = sortAvailableLanguages(Object.keys(variants), source.discovery)
  if (availableLanguages.length === 0) {
    return null
  }

  const defaultLanguage = pickDefaultLanguage(availableLanguages, source.discovery.canonical.language)
  const canonicalVariant = variants[defaultLanguage] ?? variants[availableLanguages[0]]
  if (!canonicalVariant) {
    return null
  }

  const type = inferAgentType(entry.agentId, canonicalVariant)
  const allVariants = availableLanguages.map((language) => variants[language]).filter(Boolean)
  const tools = dedupeStrings(allVariants.flatMap((variant) => toStringArray(variant.attributes.tools)))
  const model =
    canonicalVariant.attributes.model ?? findFirstValue(availableLanguages, (language) => variants[language]?.attributes.model)
  const tags = buildTags(entry.agentId, type, allVariants)

  return {
    traitCatalogId: entry.agentId,
    agentId: entry.agentId,
    name: canonicalVariant.title,
    summary: canonicalVariant.summary || `${startCase(entry.agentId)} sourced from ${source.label}.`,
    type,
    tags,
    tools,
    model: typeof model === "string" ? model : null,
    sourceId: source.id,
    sourceLabel: source.label,
    sourceRepo: source.repo,
    sourceType: source.sourceType,
    sourceUrl: source.homepageUrl,
    canonicalPath: entry.canonicalPath,
    defaultLanguage,
    availableLanguages,
    variants,
  }
}

async function readVariant({ source, agentId, language, sourcePath, repoRootPath }) {
  const localPath = path.join(resolveSourceRoot(source, repoRootPath), sourcePath)
  const sourceUrl = buildSourceUrl(source.repo, source.branch, sourcePath)
  const rawUrl = buildRawUrl(source.repo, source.branch, sourcePath)

  try {
    const markdown = await fs.readFile(localPath, "utf8")
    const parsed = parseMarkdownFile(markdown)
    const title = startCase(parsed.attributes.name ?? agentId)
    const summary = parsed.attributes.description ?? firstParagraph(parsed.body)
    const bodyPlainText = toPlainText(parsed.body)

    return {
      ok: true,
      variant: {
        language,
        title,
        summary,
        body: parsed.body,
        bodyPlainText,
        sourcePath,
        sourceUrl,
        rawUrl,
        attributes: parsed.attributes,
      },
    }
  } catch (error) {
    return {
      ok: false,
      code: isMissingFileError(error) ? "missing_variant" : "read_failed",
      message: `${agentId} (${language}) failed to read local file ${path.relative(repoRootPath, localPath)}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function buildLanguageIndex(items) {
  const index = {}

  for (const item of items) {
    for (const language of item.availableLanguages) {
      index[language] ??= []
      index[language].push(item.agentId)
    }
  }

  return Object.fromEntries(
    Object.entries(index)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([language, agentIds]) => [language, agentIds.sort((left, right) => left.localeCompare(right))])
  )
}

function buildSourceSnapshot({ source, items, trackedAgents, lastSyncedAt }) {
  const sourceItems = items.filter((item) => item.sourceId === source.id)
  const languages = Array.from(new Set(sourceItems.flatMap((item) => item.availableLanguages))).sort((left, right) =>
    left.localeCompare(right)
  )

  return {
    id: source.id,
    label: source.label,
    repo: source.repo,
    branch: source.branch,
    homepageUrl: source.homepageUrl,
    sourceType: source.sourceType,
    trackedAgents,
    syncedAgents: sourceItems.length,
    languages,
    lastSyncedAt,
  }
}

export function inferAgentType(agentId, canonicalVariant) {
  const normalizedId = agentId.toLowerCase()
  const sample = `${canonicalVariant.summary ?? ""} ${canonicalVariant.bodyPlainText ?? ""}`.toLowerCase()
  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(normalizedId)) {
      return type
    }
  }

  if (sample.includes("review")) {
    return "reviewer"
  }

  if (sample.includes("build") && (sample.includes("resolver") || sample.includes("resolution"))) {
    return "build-resolver"
  }

  return agentId
}

function buildTags(agentId, type, variants) {
  const slugTags = agentId
    .split("-")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  const inferredTags = variants.flatMap((variant) => inferTags(variant))

  return dedupeStrings([type, ...slugTags, ...inferredTags])
}

function inferTags(variant) {
  const sample = `${variant.title} ${variant.summary} ${variant.bodyPlainText}`.toLowerCase()
  const tags = []

  if (sample.includes("typescript") || sample.includes("javascript")) {
    tags.push("typescript")
  }
  if (sample.includes("java")) {
    tags.push("java")
  }
  if (sample.includes("kotlin")) {
    tags.push("kotlin")
  }
  if (sample.includes("python") || sample.includes("pytorch")) {
    tags.push("python")
  }
  if (sample.includes("gradle")) {
    tags.push("gradle")
  }
  if (sample.includes("maven")) {
    tags.push("maven")
  }
  if (sample.includes("security")) {
    tags.push("security")
  }
  if (sample.includes("architecture")) {
    tags.push("architecture")
  }
  if (sample.includes("plan")) {
    tags.push("planning")
  }

  return tags
}

function pickDefaultLanguage(availableLanguages, preferredLanguage) {
  return availableLanguages.includes(preferredLanguage) ? preferredLanguage : availableLanguages[0]
}

function sortAvailableLanguages(languages, discovery) {
  const preferredOrder = Object.keys(discovery.variants)
  return languages.sort((left, right) => {
    const leftIndex = preferredOrder.indexOf(left)
    const rightIndex = preferredOrder.indexOf(right)

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) {
        return 1
      }
      if (rightIndex === -1) {
        return -1
      }
      return leftIndex - rightIndex
    }

    return left.localeCompare(right)
  })
}

function deriveCanonicalAgentId(fileName) {
  return fileName.replace(/\.md$/i, "")
}

function resolveSourceRoot(source, repoRootPath = repoRoot) {
  return path.resolve(repoRootPath, source.submodulePath)
}

async function isDirectory(targetPath) {
  try {
    const stat = await fs.stat(targetPath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

function isExcludedPath(value, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(value))
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
  return new RegExp(`^${escaped}$`)
}

function isMissingFileError(error) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT")
}

function parseMarkdownFile(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n")
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)

  if (!match) {
    return {
      attributes: {},
      body: normalized.trim(),
    }
  }

  return {
    attributes: parseFrontmatter(match[1]),
    body: match[2].trim(),
  }
}

function parseFrontmatter(frontmatter) {
  const attributes = {}

  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf(":")
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const rawValue = line.slice(separatorIndex + 1).trim()
    attributes[key] = parseFrontmatterValue(rawValue)
  }

  return attributes
}

function parseFrontmatterValue(rawValue) {
  if (!rawValue) {
    return ""
  }

  if ((rawValue.startsWith("[") && rawValue.endsWith("]")) || (rawValue.startsWith("{") && rawValue.endsWith("}"))) {
    try {
      return JSON.parse(rawValue)
    } catch {
      return rawValue
    }
  }

  if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
    return rawValue.slice(1, -1)
  }

  if (rawValue === "true") {
    return true
  }

  if (rawValue === "false") {
    return false
  }

  return rawValue
}

function buildRawUrl(repo, branch, sourcePath) {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${sourcePath}`
}

function buildSourceUrl(repo, branch, sourcePath) {
  return `https://github.com/${repo}/blob/${branch}/${sourcePath}`
}

function findFirstValue(values, selector) {
  for (const value of values) {
    const result = selector(value)
    if (result != null && result !== "") {
      return result
    }
  }

  return null
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string")
  }
  if (typeof value === "string" && value.length > 0) {
    return [value]
  }
  return []
}

function dedupeStrings(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0)))
}

function firstParagraph(body) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.replace(/^#+\s*/, "").trim())
    .find(Boolean) ?? ""
}

function toPlainText(body) {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#>*_\-]/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function startCase(value) {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function toPosixPath(value) {
  return value.split(path.sep).join(path.posix.sep)
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
