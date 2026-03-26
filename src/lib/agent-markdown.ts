import type { AgentVariant } from "@/data/trait-catalog"

export function buildAgentVariantMarkdown(variant: AgentVariant) {
  const frontmatter = serializeFrontmatter(variant.attributes)

  if (!frontmatter) {
    return variant.body
  }

  return `---\n${frontmatter}\n---\n\n${variant.body}`
}

function serializeFrontmatter(attributes: AgentVariant["attributes"]) {
  const entries = Object.entries(attributes).filter(([, value]) => value !== undefined)
  if (entries.length === 0) {
    return ""
  }

  return entries
    .map(([key, value]) => `${key}: ${serializeFrontmatterValue(value)}`)
    .join("\n")
}

function serializeFrontmatterValue(value: unknown) {
  if (typeof value === "string") {
    return JSON.stringify(value)
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  if (value == null) {
    return "null"
  }

  return JSON.stringify(value)
}
