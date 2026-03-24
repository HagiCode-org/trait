export const sourceManifest = {
  sources: [
    {
      id: "everything-claude-code",
      label: "everything-claude-code",
      repo: "affaan-m/everything-claude-code",
      branch: "main",
      homepageUrl: "https://github.com/affaan-m/everything-claude-code",
      sourceType: "git-submodule",
      submodulePath: "vendor/everything-claude-code",
    },
  ],
  agents: [
    createAgentEntry("typescript-reviewer", "reviewer", ["typescript", "javascript", "code review"]),
    createAgentEntry("pytorch-build-resolver", "build-resolver", ["python", "pytorch", "build"]),
    createAgentEntry("java-build-resolver", "build-resolver", ["java", "gradle", "maven"]),
    createAgentEntry("java-reviewer", "reviewer", ["java", "code review", "static analysis"]),
    createAgentEntry("kotlin-reviewer", "reviewer", ["kotlin", "android", "code review"]),
    createAgentEntry("kotlin-build-resolver", "build-resolver", ["kotlin", "gradle", "build"]),
  ],
}

function createAgentEntry(id, type, tags) {
  return {
    id,
    sourceId: "everything-claude-code",
    type,
    tags,
    defaultLanguage: "en",
    variants: {
      en: `agents/${id}.md`,
      "zh-CN": `docs/zh-CN/agents/${id}.md`,
      tr: `docs/tr/agents/${id}.md`,
    },
  }
}
