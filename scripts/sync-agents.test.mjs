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

  it("discovers canonical agents from source-level rules", async () => {
    const { manifest, repoRoot } = await createFixtureRepo()

    const entries = await discoverCanonicalAgentEntries(manifest.sources[0], repoRoot)

    expect(entries.map((entry) => entry.agentId)).toEqual(["architect", "planner"])
  })

  it("builds snapshot metrics from discovered catalog data", async () => {
    const { manifest, repoRoot } = await createFixtureRepo()

    const snapshot = await buildAgentCatalogSnapshot({
      manifest,
      repoRootPath: repoRoot,
      startedAt: "2026-03-25T00:00:00.000Z",
    })

    expect(snapshot.items).toHaveLength(2)
    expect(snapshot.sources[0]).toMatchObject({
      trackedAgents: 2,
      syncedAgents: 2,
      languages: ["en", "ja-JP", "zh-CN"],
    })
    expect(snapshot.languageIndex["ja-JP"]).toEqual(["planner"])
  })
})

async function createFixtureRepo() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "trait-sync-"))
  tempRoots.push(repoRoot)

  const sourceRoot = path.join(repoRoot, "vendor/mock-source")
  await fs.mkdir(path.join(sourceRoot, "agents"), { recursive: true })
  await fs.mkdir(path.join(sourceRoot, "docs/zh-CN/agents"), { recursive: true })
  await fs.mkdir(path.join(sourceRoot, "docs/ja-JP/agents"), { recursive: true })

  await writeAgentFile(path.join(sourceRoot, "agents/architect.md"), {
    name: "architect",
    description: "Architecture specialist.",
  })
  await writeAgentFile(path.join(sourceRoot, "agents/planner.md"), {
    name: "planner",
    description: "Planning specialist.",
  })
  await writeAgentFile(path.join(sourceRoot, "docs/zh-CN/agents/architect.md"), {
    name: "architect",
    description: "架构专家。",
  })
  await writeAgentFile(path.join(sourceRoot, "docs/zh-CN/agents/planner.md"), {
    name: "planner",
    description: "规划专家。",
  })
  await writeAgentFile(path.join(sourceRoot, "docs/ja-JP/agents/planner.md"), {
    name: "planner",
    description: "計画担当。",
  })

  return {
    repoRoot,
    manifest: {
      sources: [
        {
          id: "mock-source",
          label: "mock-source",
          repo: "example/mock-source",
          branch: "main",
          homepageUrl: "https://example.com/mock-source",
          sourceType: "git-submodule",
          submodulePath: "vendor/mock-source",
          discovery: {
            canonical: {
              language: "en",
              directory: "agents",
              extension: ".md",
              exclude: [],
            },
            variants: {
              en: "agents",
              "zh-CN": "docs/zh-CN/agents",
              "ja-JP": "docs/ja-JP/agents",
              tr: "docs/tr/agents",
            },
          },
        },
      ],
    },
  }
}

async function writeAgentFile(filePath, attributes) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(
    filePath,
    `---\nname: ${attributes.name}\ndescription: ${attributes.description}\n---\n\n# ${attributes.name}\n\n${attributes.description}\n`,
    "utf8"
  )
}
