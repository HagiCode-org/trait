import { describe, expect, it } from "vitest"

import { buildAgentVariantMarkdown } from "@/lib/agent-markdown"

describe("agent-markdown", () => {
  it("rebuilds markdown with frontmatter and body", () => {
    const markdown = buildAgentVariantMarkdown({
      language: "en",
      title: "Architect",
      summary: "Architecture specialist.",
      body: "# Architect\n\nBuild systems.",
      bodyPlainText: "Architect Build systems.",
      sourcePath: "agents/architect.md",
      sourceUrl: "https://example.com/source",
      rawUrl: "https://example.com/raw",
      attributes: {
        name: "Architect",
        description: "Architecture specialist.",
        tools: ["Read", "Edit"],
        model: "gpt-5",
      },
    })

    expect(markdown).toContain('name: "Architect"')
    expect(markdown).toContain('description: "Architecture specialist."')
    expect(markdown).toContain('tools: ["Read","Edit"]')
    expect(markdown).toContain('model: "gpt-5"')
    expect(markdown).toContain("# Architect")
  })
})
