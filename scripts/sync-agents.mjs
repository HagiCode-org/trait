import fs from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

import { sourceManifest } from "./agent-sources.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const outputPath = path.join(repoRoot, "src/data/generated/agent-catalog.json")
const execFileAsync = promisify(execFile)

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

const DISCOVERY_ADAPTERS = {
  flat: discoverFlatMarkdownEntries,
  recursive: discoverRecursiveMarkdownEntries,
}

export async function buildAgentCatalogSnapshot({
  manifest = sourceManifest,
  repoRootPath = repoRoot,
  startedAt = new Date().toISOString(),
  sourceMetricsFetcher = fetchSourceMetrics,
} = {}) {
  const enabledSources = manifest.sources.filter((source) => source.enabled !== false)
  if (enabledSources.length === 0) {
    throw new Error("No enabled sources configured for agent sync.")
  }

  const sourceMetricsPromise = sourceMetricsFetcher(enabledSources, { fetchedAt: startedAt })
  const sourceResults = []
  for (const source of enabledSources) {
    sourceResults.push(await processSource({ source, repoRootPath }))
  }
  const sourceMetrics = await sourceMetricsPromise

  const successfulSources = sourceResults.filter((result) => result.available)
  if (successfulSources.length === 0) {
    const failureSummary = sourceResults
      .flatMap((result) => result.warnings)
      .filter(Boolean)
      .join("\n")

    throw new Error(failureSummary || "All enabled sources failed to sync.")
  }

  const items = successfulSources.flatMap((result) => result.items)
  const normalizedItems = assignStableAgentIds(items).sort((left, right) => left.name.localeCompare(right.name))
  const languageIndex = buildLanguageIndex(normalizedItems)
  const sources = sourceResults.map((result) =>
    buildSourceSnapshot({
      source: result.source,
      items: normalizedItems,
      trackedAgents: result.entries.length,
      lastSyncedAt: startedAt,
      warnings: result.warnings,
      available: result.available,
      metrics: sourceMetrics.get(result.source.id),
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

  console.log(`Synced ${snapshot.items.length} agents from ${snapshot.sources.length} enabled sources to ${path.relative(repoRoot, outputPath)}`)
  console.log(`lastSyncedAt=${snapshot.lastSyncedAt}`)

  const warningSources = snapshot.sources.filter((source) => source.warningCount > 0)
  for (const source of warningSources) {
    console.warn(`[warn] ${source.id}: ${source.warningCount} warning(s)`)
  }
}

async function processSource({ source, repoRootPath }) {
  const warnings = []

  try {
    await verifySourceRoot(source, repoRootPath)
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error))
    return {
      source,
      available: false,
      entries: [],
      items: [],
      warnings,
    }
  }

  let discovery
  try {
    discovery = await discoverCanonicalAgentEntriesDetailed(source, repoRootPath)
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error))
    return {
      source,
      available: false,
      entries: [],
      items: [],
      warnings,
    }
  }

  warnings.push(...discovery.warnings)

  const variantDirectories = await resolveVariantDirectories(source, repoRootPath)
  const items = []

  for (const entry of discovery.entries) {
    const result = await buildCatalogItem({
      source,
      entry,
      repoRootPath,
      variantDirectories,
    })

    warnings.push(...result.warnings)
    if (result.item) {
      items.push(result.item)
    }
  }

  return {
    source,
    available: true,
    entries: discovery.entries,
    items,
    warnings,
  }
}

async function verifySourceRoot(source, repoRootPath) {
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
}

export async function discoverCanonicalAgentEntries(source, repoRootPath = repoRoot) {
  const { entries } = await discoverCanonicalAgentEntriesDetailed(source, repoRootPath)
  return entries
}

async function discoverCanonicalAgentEntriesDetailed(source, repoRootPath) {
  const adapter = DISCOVERY_ADAPTERS[source.layoutType]
  if (!adapter) {
    throw new Error(`Unsupported layout type "${source.layoutType}" for ${source.id}.`)
  }

  const rootPath = resolveSourceRoot(source, repoRootPath)
  const canonicalPaths = await collectCanonicalMarkdownPaths(source, rootPath, repoRootPath)
  if (canonicalPaths.length === 0) {
    throw new Error(`No canonical markdown files matched for ${source.id} using ${source.pathPatterns.join(", ")}.`)
  }

  return adapter({ source, canonicalPaths })
}

async function collectCanonicalMarkdownPaths(source, rootPath, repoRootPath) {
  const canonicalBaseDir = normalizeRelativePath(source.discovery.canonical.baseDir)
  const scanRoot = canonicalBaseDir ? path.join(rootPath, fromPosixPath(canonicalBaseDir)) : rootPath
  const scanRootExists = canonicalBaseDir ? await isDirectory(scanRoot) : true

  if (!scanRootExists) {
    throw new Error(
      `Canonical discovery root is unavailable for ${source.id}: ${path.relative(repoRootPath, scanRoot)}.`
    )
  }

  const markdownFiles = await collectMarkdownFiles(scanRoot, canonicalBaseDir)
  return markdownFiles
    .filter((relativePath) => matchesAnyPattern(relativePath, source.pathPatterns))
    .filter((relativePath) => !isExcludedPath(relativePath, source.discovery.canonical.exclude ?? []))
    .sort((left, right) => left.localeCompare(right))
}

async function collectMarkdownFiles(directoryPath, prefix = "") {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  const collected = []

  for (const entry of entries) {
    if (entry.name === ".git") {
      continue
    }

    const absolutePath = path.join(directoryPath, entry.name)
    const relativePath = joinPosixPath(prefix, entry.name)

    if (entry.isDirectory()) {
      collected.push(...(await collectMarkdownFiles(absolutePath, relativePath)))
      continue
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      collected.push(relativePath)
    }
  }

  return collected
}

function discoverFlatMarkdownEntries({ source, canonicalPaths }) {
  return {
    entries: canonicalPaths
      .map((canonicalPath) => {
        const fileName = path.posix.basename(canonicalPath)
        return {
          agentId: deriveFlatAgentId(fileName),
          fileName,
          relativePath: deriveRelativePath(canonicalPath, source.discovery.canonical.baseDir),
          canonicalPath,
        }
      })
      .sort((left, right) => left.agentId.localeCompare(right.agentId)),
    warnings: [],
  }
}

function discoverRecursiveMarkdownEntries({ source, canonicalPaths }) {
  const entries = []
  const warnings = []
  const seen = new Map()

  for (const canonicalPath of canonicalPaths) {
    const relativePath = deriveRelativePath(canonicalPath, source.discovery.canonical.baseDir)
    const fileName = path.posix.basename(canonicalPath)
    const agentId = deriveRecursiveAgentId(relativePath)

    const conflict = seen.get(agentId)
    if (conflict) {
      warnings.push(
        `Slug collision for ${source.id}: "${canonicalPath}" conflicts with "${conflict}". Skipping duplicate canonical entry.`
      )
      continue
    }

    seen.set(agentId, canonicalPath)
    entries.push({
      agentId,
      fileName,
      relativePath,
      canonicalPath,
    })
  }

  return {
    entries: entries.sort((left, right) => left.agentId.localeCompare(right.agentId)),
    warnings,
  }
}

async function resolveVariantDirectories(source, repoRootPath) {
  const rootPath = resolveSourceRoot(source, repoRootPath)
  const directories = new Map()

  for (const [language, directory] of Object.entries(source.discovery.variants)) {
    const normalizedDirectory = normalizeRelativePath(directory)
    const absolutePath = normalizedDirectory ? path.join(rootPath, fromPosixPath(normalizedDirectory)) : rootPath
    const available = await isDirectory(absolutePath)
    directories.set(language, { directory: normalizedDirectory, available })
  }

  return directories
}

async function buildCatalogItem({ source, entry, repoRootPath, variantDirectories }) {
  const variants = {}
  const warnings = []

  for (const [language, variantDirectory] of variantDirectories.entries()) {
    if (!variantDirectory.available) {
      continue
    }

    const sourcePath = mapCanonicalPathToVariantPath(
      entry.canonicalPath,
      source.discovery.canonical.baseDir,
      variantDirectory.directory
    )

    const result = await readVariant({
      source,
      agentId: entry.agentId,
      language,
      sourcePath,
      repoRootPath,
    })

    if (!result.ok) {
      if (language === source.discovery.canonical.language || result.code === "read_failed") {
        warnings.push(result.message)
      }
      continue
    }

    variants[language] = result.variant
  }

  const availableLanguages = sortAvailableLanguages(Object.keys(variants), source.discovery)
  if (availableLanguages.length === 0) {
    warnings.push(`Canonical entry ${entry.agentId} from ${source.id} has no readable variants.`)
    return { item: null, warnings }
  }

  const defaultLanguage = pickDefaultLanguage(availableLanguages, source.discovery.canonical.language)
  const canonicalVariant = variants[defaultLanguage] ?? variants[availableLanguages[0]]
  if (!canonicalVariant) {
    warnings.push(`Canonical entry ${entry.agentId} from ${source.id} could not resolve a default variant.`)
    return { item: null, warnings }
  }

  const type = inferAgentType(entry.agentId, canonicalVariant)
  const allVariants = availableLanguages.map((language) => variants[language]).filter(Boolean)
  const tools = dedupeStrings(allVariants.flatMap((variant) => toStringArray(variant.attributes.tools)))
  const model =
    canonicalVariant.attributes.model ?? findFirstValue(availableLanguages, (language) => variants[language]?.attributes.model)
  const tags = buildTags(entry.agentId, type, allVariants)

  return {
    item: {
      traitCatalogId: entry.agentId,
      agentId: entry.agentId,
      sourceAgentId: entry.agentId,
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
    },
    warnings,
  }
}

async function readVariant({ source, agentId, language, sourcePath, repoRootPath }) {
  const localPath = path.join(resolveSourceRoot(source, repoRootPath), fromPosixPath(sourcePath))
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

function buildSourceSnapshot({ source, items, trackedAgents, lastSyncedAt, warnings, available, metrics }) {
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
    cliFamily: source.cliFamily,
    sourceKind: source.sourceKind,
    layoutType: source.layoutType,
    fileFormat: source.fileFormat,
    pathPatterns: [...source.pathPatterns],
    directCompatible: source.directCompatible,
    needsRecursiveScan: source.needsRecursiveScan,
    needsCustomParser: source.needsCustomParser,
    trackedAgents,
    syncedAgents: sourceItems.length,
    languages,
    stargazerCount: metrics?.stargazerCount ?? null,
    stargazerCountLastFetchedAt: metrics?.stargazerCountLastFetchedAt ?? null,
    lastSyncedAt,
    available,
    warningCount: warnings.length,
    warnings,
  }
}

async function fetchSourceMetrics(sources, { fetchedAt }) {
  const results = new Map()
  const repoMetrics = new Map()

  await Promise.all(
    sources.map(async (source) => {
      const pendingMetrics = repoMetrics.get(source.repo) ?? fetchGithubRepoMetrics(source.repo, fetchedAt)
      repoMetrics.set(source.repo, pendingMetrics)
      results.set(source.id, await pendingMetrics)
    })
  )

  return results
}

async function fetchGithubRepoMetrics(repo, fetchedAt) {
  const stargazerCount = await fetchGithubStargazerCount(repo)
  return {
    stargazerCount,
    stargazerCountLastFetchedAt: typeof stargazerCount === "number" ? fetchedAt : null,
  }
}

async function fetchGithubStargazerCount(repo) {
  const ghStargazerCount = await fetchGithubStargazerCountWithGh(repo)
  if (typeof ghStargazerCount === "number") {
    return ghStargazerCount
  }

  return fetchGithubStargazerCountWithHttp(repo)
}

async function fetchGithubStargazerCountWithGh(repo) {
  try {
    const { stdout } = await execFileAsync("gh", ["api", `repos/${repo}`, "--jq", ".stargazers_count"], {
      cwd: repoRoot,
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    })

    return parseStargazerCount(stdout, `gh api repos/${repo}`)
  } catch {
    return null
  }
}

async function fetchGithubStargazerCountWithHttp(repo) {
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "hagitrait-sync",
    }

    if (process.env.GH_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GH_TOKEN}`
    }

    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()
    return parseStargazerCount(payload?.stargazers_count, `https://api.github.com/repos/${repo}`)
  } catch {
    return null
  }
}

function parseStargazerCount(rawValue, sourceLabel) {
  const normalizedValue = typeof rawValue === "string" ? rawValue.trim() : rawValue
  const stargazerCount = Number.parseInt(String(normalizedValue), 10)
  if (Number.isNaN(stargazerCount)) {
    throw new Error(`Invalid stargazer count from ${sourceLabel}: ${String(rawValue)}`)
  }

  return stargazerCount
}

function assignStableAgentIds(items) {
  const counts = new Map()

  for (const item of items) {
    counts.set(item.agentId, (counts.get(item.agentId) ?? 0) + 1)
  }

  return items.map((item) => {
    if ((counts.get(item.agentId) ?? 0) <= 1) {
      return item
    }

    const scopedAgentId = `${item.sourceId}-${item.agentId}`
    return {
      ...item,
      traitCatalogId: scopedAgentId,
      agentId: scopedAgentId,
    }
  })
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
  return [...languages].sort((left, right) => {
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

function deriveFlatAgentId(fileName) {
  return fileName.replace(/\.md$/i, "")
}

function deriveRecursiveAgentId(relativePath) {
  return relativePath
    .replace(/\.md$/i, "")
    .split("/")
    .flatMap((segment) => segment.split(/[^a-zA-Z0-9]+/g))
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)
    .join("-")
}

function deriveRelativePath(canonicalPath, canonicalBaseDir) {
  const normalizedCanonicalPath = normalizeRelativePath(canonicalPath)
  const normalizedBaseDir = normalizeRelativePath(canonicalBaseDir)
  if (!normalizedBaseDir) {
    return normalizedCanonicalPath
  }

  const prefix = `${normalizedBaseDir}/`
  return normalizedCanonicalPath.startsWith(prefix) ? normalizedCanonicalPath.slice(prefix.length) : normalizedCanonicalPath
}

function mapCanonicalPathToVariantPath(canonicalPath, canonicalBaseDir, variantBaseDir) {
  const normalizedCanonicalPath = normalizeRelativePath(canonicalPath)
  const normalizedBaseDir = normalizeRelativePath(canonicalBaseDir)
  const normalizedVariantBaseDir = normalizeRelativePath(variantBaseDir)

  if (normalizedBaseDir) {
    const prefix = `${normalizedBaseDir}/`
    if (normalizedCanonicalPath.startsWith(prefix)) {
      return joinPosixPath(normalizedVariantBaseDir, normalizedCanonicalPath.slice(prefix.length))
    }
  }

  if (!normalizedVariantBaseDir) {
    return normalizedCanonicalPath
  }

  return joinPosixPath(normalizedVariantBaseDir, normalizedCanonicalPath)
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

function matchesAnyPattern(value, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(value))
}

function isExcludedPath(value, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(value))
}

function globToRegExp(pattern) {
  const normalizedPattern = normalizeRelativePath(pattern)
  let regex = "^"

  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const character = normalizedPattern[index]
    const nextCharacter = normalizedPattern[index + 1]
    const afterNextCharacter = normalizedPattern[index + 2]

    if (character === "*" && nextCharacter === "*") {
      if (afterNextCharacter === "/") {
        regex += "(?:[^/]+/)*"
        index += 2
      } else {
        regex += ".*"
        index += 1
      }
      continue
    }

    if (character === "*") {
      regex += "[^/]*"
      continue
    }

    if (character === "?") {
      regex += "[^/]"
      continue
    }

    regex += escapeRegExp(character)
  }

  return new RegExp(`${regex}$`)
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&")
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

function normalizeRelativePath(value) {
  return String(value ?? "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
}

function joinPosixPath(...parts) {
  const filtered = parts.map((part) => normalizeRelativePath(part)).filter(Boolean)
  return filtered.length > 0 ? path.posix.join(...filtered) : ""
}

function fromPosixPath(value) {
  return normalizeRelativePath(value).split("/").join(path.sep)
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
