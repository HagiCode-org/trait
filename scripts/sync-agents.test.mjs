import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { buildAgentCatalogSnapshot, discoverCanonicalAgentEntries } from "./sync-agents.mjs"

const tempRoots = []

describe("sync-agents discovery pipeline", () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })))
  })

  it("discovers canonical agents from multiple flat sources", async () => {
    const { manifest, repoRoot } = await createFixtureRepo({
      sources: [
        createMockSource({
          id: "flat-a",
          submodulePath: "vendor/flat-a",
          pathPatterns: ["agents/*.md"],
          canonicalBaseDir: "agents",
          files: {
            "agents/architect.md": { name: "architect", description: "Architecture specialist." },
            "agents/planner.md": { name: "planner", description: "Planning specialist." },
          },
        }),
        createMockSource({
          id: "flat-b",
          label: "flat-b",
          repo: "example/flat-b",
          submodulePath: "vendor/flat-b",
          pathPatterns: ["*.md"],
          exclude: ["README.md"],
          files: {
            "README.md": { name: "ignored", description: "Ignored file." },
            "react-wizard.md": { name: "react-wizard", description: "React specialist." },
          },
        }),
      ],
    })

    const entries = await discoverCanonicalAgentEntries(manifest.sources[0], repoRoot)
    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
      sourceMetricsFetcher: createMockSourceMetricsFetcher({
        "flat-a": 12,
        "flat-b": 8,
      }),
    })

    expect(entries.map((entry) => entry.agentId)).toEqual(["architect", "planner"])
    expect(snapshot.items.map((item) => item.sourceId)).toEqual(["flat-a", "flat-a", "flat-b"])
    expect(snapshot.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "flat-a",
          sourceKind: "agent_markdown_flat",
          layoutType: "flat",
          pathPatterns: ["agents/*.md"],
          trackedAgents: 2,
          syncedAgents: 2,
          stargazerCount: 12,
        }),
        expect.objectContaining({
          id: "flat-b",
          pathPatterns: ["*.md"],
          trackedAgents: 1,
          syncedAgents: 1,
          stargazerCount: 8,
        }),
      ])
    )
  })

  it("discovers recursive markdown sources and derives stable ids from relative paths", async () => {
    const { manifest, repoRoot } = await createFixtureRepo({
      sources: [
        createMockSource({
          id: "recursive-source",
          sourceKind: "agent_markdown_recursive",
          layoutType: "recursive",
          submodulePath: "vendor/recursive-source",
          pathPatterns: ["**/*.md"],
          files: {
            "architecture/api-designer.md": { name: "api-designer", description: "API design specialist." },
            "marketing/api-designer.md": { name: "api-designer", description: "Marketing API writer." },
          },
        }),
      ],
    })

    const entries = await discoverCanonicalAgentEntries(manifest.sources[0], repoRoot)
    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
      sourceMetricsFetcher: createMockSourceMetricsFetcher({
        "recursive-source": 34,
      }),
    })

    expect(entries.map((entry) => entry.agentId)).toEqual(["architecture-api-designer", "marketing-api-designer"])
    expect(snapshot.items.map((item) => item.agentId)).toEqual(["architecture-api-designer", "marketing-api-designer"])
    expect(snapshot.sources[0]).toMatchObject({
      sourceKind: "agent_markdown_recursive",
      layoutType: "recursive",
      trackedAgents: 2,
      syncedAgents: 2,
      stargazerCount: 34,
      warningCount: 0,
    })
  })

  it("continues snapshot generation when one enabled source is unavailable", async () => {
    const { manifest, repoRoot } = await createFixtureRepo({
      sources: [
        createMockSource({
          id: "healthy-source",
          submodulePath: "vendor/healthy-source",
          pathPatterns: ["agents/*.md"],
          canonicalBaseDir: "agents",
          files: {
            "agents/planner.md": { name: "planner", description: "Planning specialist." },
          },
        }),
        createMockSource({
          id: "missing-source",
          repo: "example/missing-source",
          submodulePath: "vendor/missing-source",
        }),
      ],
    })

    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
      sourceMetricsFetcher: createMockSourceMetricsFetcher({
        "healthy-source": 21,
        "missing-source": null,
      }),
    })

    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "healthy-source",
          trackedAgents: 1,
          syncedAgents: 1,
          available: true,
          stargazerCount: 21,
          warningCount: 0,
        }),
        expect.objectContaining({
          id: "missing-source",
          trackedAgents: 0,
          syncedAgents: 0,
          available: false,
          stargazerCount: null,
          warningCount: 1,
        }),
      ])
    )
  })

  it("scopes colliding agent ids across sources to keep routes unique", async () => {
    const { manifest, repoRoot } = await createFixtureRepo({
      sources: [
        createMockSource({
          id: "source-a",
          submodulePath: "vendor/source-a",
          pathPatterns: ["agents/*.md"],
          canonicalBaseDir: "agents",
          files: {
            "agents/planner.md": { name: "planner", description: "Planning specialist." },
          },
        }),
        createMockSource({
          id: "source-b",
          submodulePath: "vendor/source-b",
          pathPatterns: ["agents/*.md"],
          canonicalBaseDir: "agents",
          files: {
            "agents/planner.md": { name: "planner", description: "Another planning specialist." },
          },
        }),
      ],
    })

    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
      sourceMetricsFetcher: createMockSourceMetricsFetcher({
        "source-a": 5,
        "source-b": 7,
      }),
    })

    expect(snapshot.items.map((item) => item.agentId).sort()).toEqual(["source-a-planner", "source-b-planner"])
    expect(snapshot.items.map((item) => item.sourceAgentId)).toEqual(["planner", "planner"])
  })

  it("warns when recursive paths collapse to the same slug", async () => {
    const { manifest, repoRoot } = await createFixtureRepo({
      sources: [
        createMockSource({
          id: "collision-source",
          sourceKind: "agent_markdown_recursive",
          layoutType: "recursive",
          submodulePath: "vendor/collision-source",
          pathPatterns: ["**/*.md"],
          files: {
            "quality/code-reviewer.md": { name: "code-reviewer", description: "Code review specialist." },
            "quality/code_reviewer.md": { name: "code-reviewer", description: "Alternate code review specialist." },
          },
        }),
      ],
    })

    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
      sourceMetricsFetcher: createMockSourceMetricsFetcher({
        "collision-source": 3,
      }),
    })

    expect(snapshot.items).toHaveLength(1)
    expect(snapshot.sources[0].warningCount).toBeGreaterThan(0)
    expect(snapshot.sources[0].warnings[0]).toContain("Slug collision")
  })

  it("preserves language coverage and source metadata in the generated snapshot", async () => {
    const { manifest, repoRoot } = await createFixtureRepo({
      sources: [
        createMockSource({
          id: "translated-source",
          submodulePath: "vendor/translated-source",
          pathPatterns: ["agents/*.md"],
          canonicalBaseDir: "agents",
          variantDirectories: {
            en: "agents",
            "zh-CN": "docs/zh-CN/agents",
            "ja-JP": "docs/ja-JP/agents",
          },
          files: {
            "agents/architect.md": { name: "architect", description: "Architecture specialist." },
            "agents/planner.md": { name: "planner", description: "Planning specialist." },
            "docs/zh-CN/agents/architect.md": { name: "architect", description: "架构专家。" },
            "docs/zh-CN/agents/planner.md": { name: "planner", description: "规划专家。" },
            "docs/ja-JP/agents/planner.md": { name: "planner", description: "計画担当。" },
          },
        }),
      ],
    })

    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
      sourceMetricsFetcher: createMockSourceMetricsFetcher({
        "translated-source": 55,
      }),
    })

    expect(snapshot.items).toHaveLength(2)
    expect(snapshot.sources[0]).toMatchObject({
      cliFamily: "claude",
      sourceKind: "agent_markdown_flat",
      layoutType: "flat",
      pathPatterns: ["agents/*.md"],
      trackedAgents: 2,
      syncedAgents: 2,
      languages: ["en", "ja-JP", "zh-CN"],
      stargazerCount: 55,
      stargazerCountLastFetchedAt: "2026-03-25T00:00:00.000Z",
    })
    expect(snapshot.languageIndex["ja-JP"]).toEqual(["planner"])
  })
})

async function createFixtureRepo({ sources }) {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "trait-sync-"))
  tempRoots.push(repoRoot)

  for (const source of sources) {
    if (!source.files) {
      continue
    }

    const sourceRoot = path.join(repoRoot, source.submodulePath)
    await fs.mkdir(sourceRoot, { recursive: true })

    for (const [relativePath, attributes] of Object.entries(source.files)) {
      await writeAgentFile(path.join(sourceRoot, relativePath), attributes)
    }
  }

  return {
    repoRoot,
    manifest: {
      sources: sources.map(({ files, ...source }) => source),
    },
  }
}

function createMockSource({
  id,
  label = id,
  repo = `example/${id}`,
  branch = "main",
  submodulePath,
  sourceKind = "agent_markdown_flat",
  layoutType = "flat",
  pathPatterns = ["agents/*.md"],
  canonicalBaseDir = "",
  exclude = [],
  variantDirectories,
  files,
}) {
  return {
    id,
    label,
    repo,
    branch,
    homepageUrl: `https://example.com/${id}`,
    sourceType: "git-submodule",
    submodulePath,
    cliFamily: "claude",
    sourceKind,
    layoutType,
    fileFormat: "md",
    pathPatterns,
    directCompatible: true,
    needsRecursiveScan: layoutType === "recursive",
    needsCustomParser: false,
    enabled: true,
    discovery: {
      canonical: {
        language: "en",
        baseDir: canonicalBaseDir,
        exclude,
      },
      variants: variantDirectories ?? {
        en: canonicalBaseDir,
      },
    },
    files,
  }
}

function createMockSourceMetricsFetcher(stargazerCounts = {}) {
  return async (sources, { fetchedAt }) =>
    new Map(
      sources.map((source) => [
        source.id,
        {
          stargazerCount: stargazerCounts[source.id] ?? null,
          stargazerCountLastFetchedAt:
            typeof stargazerCounts[source.id] === "number" ? fetchedAt : null,
        },
      ])
    )
}

async function writeAgentFile(filePath, attributes) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(
    filePath,
    `---\nname: ${attributes.name}\ndescription: ${attributes.description}\n---\n\n# ${attributes.name}\n\n${attributes.description}\n`,
    "utf8"
  )
}
