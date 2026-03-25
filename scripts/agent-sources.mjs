function createDiscoveryConfig() {
  return {
    canonical: {
      language: "en",
      directory: "agents",
      extension: ".md",
      exclude: [],
    },
    variants: {
      en: "agents",
      "zh-CN": "docs/zh-CN/agents",
      "zh-TW": "docs/zh-TW/agents",
      tr: "docs/tr/agents",
      "ja-JP": "docs/ja-JP/agents",
      "ko-KR": "docs/ko-KR/agents",
      "pt-BR": "docs/pt-BR/agents",
    },
  }
}

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
      discovery: createDiscoveryConfig(),
    },
  ],
}
