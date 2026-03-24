import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { sourceManifest } from "./agent-sources.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const outputPath = path.join(repoRoot, "src/data/generated/agent-catalog.json")

async function main() {
  const startedAt = new Date().toISOString()
  const warnings = []
  const sourceMap = new Map(sourceManifest.sources.map((source) => [source.id, source]))

  await verifySourceRoots(sourceManifest.sources)

  const items = await Promise.all(
    sourceManifest.agents.map(async (entry) => {
      const source = sourceMap.get(entry.sourceId)
      if (!source) {
        const warning = createWarning("missing_source", {
          agentId: entry.id,
          sourceId: entry.sourceId,
          message: `Source definition not found for ${entry.id}`,
        })
        warnings.push(warning)
        return null
      }

      const variants = {}
      const itemWarnings = []

      await Promise.all(
        Object.entries(entry.variants).map(async ([language, sourcePath]) => {
          const result = await readVariant({ source, agentId: entry.id, language, sourcePath })
          if (!result.ok) {
            const warning = createWarning(result.code, {
              agentId: entry.id,
              language,
              sourceId: source.id,
              sourcePath,
              message: result.message,
            })
            warnings.push(warning)
            itemWarnings.push(warning)
            return
          }

          variants[language] = result.variant
        })
      )

      const availableLanguages = Object.keys(variants)
      if (availableLanguages.length === 0) {
        const warning = createWarning("missing_all_variants", {
          agentId: entry.id,
          sourceId: source.id,
          message: `No local variants were found for ${entry.id}`,
        })
        warnings.push(warning)
        itemWarnings.push(warning)
        return null
      }

      const defaultLanguage = variants[entry.defaultLanguage]
        ? entry.defaultLanguage
        : availableLanguages[0]
      const canonicalVariant = variants[defaultLanguage]
      const type = inferAgentType(entry.id, canonicalVariant.attributes.description, entry.type)
      const mergedTags = Array.from(new Set([...(entry.tags ?? []), type, ...inferTags(canonicalVariant)]))
      const tools = dedupeStrings([
        ...toStringArray(canonicalVariant.attributes.tools),
        ...availableLanguages.flatMap((language) => toStringArray(variants[language].attributes.tools)),
      ])
      const model =
        canonicalVariant.attributes.model ??
        findFirstValue(availableLanguages, (language) => variants[language].attributes.model)

      return {
        traitCatalogId: entry.id,
        agentId: entry.id,
        name: startCase(canonicalVariant.attributes.name ?? entry.id),
        summary: canonicalVariant.attributes.description ?? `${startCase(entry.id)} sourced from ${source.label}.`,
        type,
        tags: mergedTags,
        tools,
        model: typeof model === "string" ? model : null,
        sourceId: source.id,
        sourceLabel: source.label,
        sourceRepo: source.repo,
        sourceType: source.sourceType,
        sourceUrl: source.homepageUrl,
        canonicalPath: canonicalVariant.sourcePath,
        defaultLanguage,
        availableLanguages,
        warnings: itemWarnings,
        variants,
      }
    })
  )

  const normalizedItems = items.filter(Boolean).sort((left, right) => left.name.localeCompare(right.name))
  const languageIndex = buildLanguageIndex(normalizedItems)
  const sources = sourceManifest.sources.map((source) =>
    buildSourceSnapshot(source, normalizedItems, warnings, startedAt)
  )

  const snapshot = {
    version: 1,
    lastSyncedAt: startedAt,
    warnings,
    languageIndex,
    sources,
    items: normalizedItems,
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8")

  console.log(`Synced ${normalizedItems.length} agents from local submodules to ${path.relative(repoRoot, outputPath)}`)
  console.log(`lastSyncedAt=${startedAt}`)
  if (warnings.length > 0) {
    console.warn(`warnings=${warnings.length}`)
    for (const warning of warnings) {
      console.warn(`- ${warning.code}: ${warning.message}`)
    }
  } else {
    console.log("warnings=0")
  }
}

async function verifySourceRoots(sources) {
  await Promise.all(
    sources.map(async (source) => {
      const rootPath = resolveSourceRoot(source)
      try {
        const stat = await fs.stat(rootPath)
        if (!stat.isDirectory()) {
          throw new Error("Source root is not a directory")
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(
          `Local source is not ready for ${source.id}: ${path.relative(repoRoot, rootPath)} (${message}). Run \`npm run sync:agents:update-source\` first.`
        )
      }
    })
  )
}

async function readVariant({ source, agentId, language, sourcePath }) {
  const localPath = path.join(resolveSourceRoot(source), sourcePath)
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
      message: `${agentId} (${language}) failed to read local file ${path.relative(repoRoot, localPath)}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

function resolveSourceRoot(source) {
  return path.resolve(repoRoot, source.submodulePath)
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

function buildLanguageIndex(items) {
  return items.reduce((index, item) => {
    for (const language of item.availableLanguages) {
      index[language] ??= []
      index[language].push(item.agentId)
    }
    return index
  }, {})
}

function buildSourceSnapshot(source, items, warnings, lastSyncedAt) {
  const sourceItems = items.filter((item) => item.sourceId === source.id)
  const sourceWarnings = warnings.filter((warning) => warning.sourceId === source.id)
  const languages = Array.from(new Set(sourceItems.flatMap((item) => item.availableLanguages))).sort()

  return {
    id: source.id,
    label: source.label,
    repo: source.repo,
    branch: source.branch,
    homepageUrl: source.homepageUrl,
    sourceType: source.sourceType,
    status: sourceWarnings.length > 0 ? "partial" : "fresh",
    trackedAgents: sourceManifest.agents.filter((entry) => entry.sourceId === source.id).length,
    syncedAgents: sourceItems.length,
    languages,
    warningCount: sourceWarnings.length,
    lastSyncedAt,
  }
}

function inferAgentType(agentId, description, fallback) {
  const sample = `${agentId} ${description ?? ""}`.toLowerCase()
  if (sample.includes("review")) {
    return "reviewer"
  }
  if (sample.includes("build") || sample.includes("resolver")) {
    return "build-resolver"
  }
  return fallback ?? "reviewer"
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
  return tags
}

function createWarning(code, payload) {
  return {
    code,
    ...payload,
  }
}

function buildRawUrl(repo, branch, sourcePath) {
  return `https://raw.githubusercontent.com/${repo}/${branch}/${sourcePath}`
}

function buildSourceUrl(repo, branch, sourcePath) {
  return `https://github.com/${repo}/blob/${branch}/${sourcePath}`
}

function findFirstValue(languages, selector) {
  for (const language of languages) {
    const value = selector(language)
    if (value != null && value !== "") {
      return value
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

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
