import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { dump } from "js-yaml"
import { afterEach, describe, expect, it } from "vitest"
import { generateI18nResources, verifyGeneratedI18nResources } from "../generate-i18n-resources.mjs"

const expectedLocales = [
  "en-US",
  "zh-CN",
  "zh-Hant",
  "ja-JP",
  "ko-KR",
  "de-DE",
  "fr-FR",
  "es-ES",
  "pt-BR",
  "ru-RU",
]
const expectedGeneratedFiles = [
  "de-DE.ts",
  "en.ts",
  "es-ES.ts",
  "fr-FR.ts",
  "ja-JP.ts",
  "ko-KR.ts",
  "pt-BR.ts",
  "ru-RU.ts",
  "zh-CN.ts",
  "zh-Hant.ts",
]
const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directoryPath) => fs.rm(directoryPath, { recursive: true, force: true })),
  )
})

async function createFixture(overrides = {}) {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "trait-i18n-"))
  temporaryDirectories.push(fixtureRoot)

  const localesRoot = path.join(fixtureRoot, "locales-source")
  const generatedRoot = path.join(fixtureRoot, "locales")
  const baseMessages = {
    localeEnglish: "EN",
    localeChinese: "中文",
    resultCount_one: "1 result",
    resultCount_other: "{{count}} results",
    footerCopyright: "© {{year}} HagiCode. All rights reserved.",
  }
  const zhMessages = {
    localeEnglish: "EN",
    localeChinese: "中文",
    resultCount_one: "1 条结果",
    resultCount_other: "{{count}} 条结果",
    footerCopyright: "© {{year}} HagiCode。保留所有权利。",
  }

  for (const locale of expectedLocales) {
    const directory = path.join(localesRoot, locale)
    await fs.mkdir(directory, { recursive: true })
    const messages = locale === "zh-CN" ? zhMessages : baseMessages
    await fs.writeFile(path.join(directory, "ui.yml"), dump(messages, { lineWidth: -1, noRefs: true }), "utf8")
  }

  if (overrides.missingNamespaceLocale) {
    await fs.rm(path.join(localesRoot, overrides.missingNamespaceLocale, "ui.yml"))
  }

  if (overrides.placeholderMismatchLocale) {
    await fs.writeFile(
      path.join(localesRoot, overrides.placeholderMismatchLocale, "ui.yml"),
      dump({ ...baseMessages, resultCount_other: "results" }, { lineWidth: -1, noRefs: true }),
      "utf8",
    )
  }

  return {
    expectedLocales,
    generatedRoot,
    localesRoot,
  }
}

describe("Trait i18n resource generation", () => {
  it("writes deterministic runtime modules for the full Desktop locale set", async () => {
    const fixture = await createFixture()

    await generateI18nResources(fixture)

    await expect(fs.readdir(fixture.generatedRoot).then((files) => files.sort((left, right) => left.localeCompare(right)))).resolves.toEqual(
      expectedGeneratedFiles,
    )
    await expect(fs.readFile(path.join(fixture.generatedRoot, "en.ts"), "utf8")).resolves.toContain(
      'export const enMessages: LocaleMessages = {',
    )
    await expect(fs.readFile(path.join(fixture.generatedRoot, "zh-CN.ts"), "utf8")).resolves.toContain(
      'export const zhCnMessages: LocaleMessages = {',
    )
    await expect(verifyGeneratedI18nResources(fixture)).resolves.toMatchObject({
      localeCount: expectedLocales.length,
      namespaceCount: 1,
    })
  })

  it("fails stale-output validation with an actionable regeneration message", async () => {
    const fixture = await createFixture()

    await generateI18nResources(fixture)
    await fs.writeFile(path.join(fixture.generatedRoot, "zh-CN.ts"), "stale", "utf8")

    await expect(verifyGeneratedI18nResources(fixture)).rejects.toThrow(
      /src\/i18n\/locales|zh-CN\.ts is stale; rerun npm run i18n:generate/,
    )
  })

  it("fails when an expected namespace file is missing", async () => {
    const fixture = await createFixture({ missingNamespaceLocale: "de-DE" })

    await expect(generateI18nResources(fixture)).rejects.toThrow(/de-DE YAML namespaces must match expected Trait namespaces/)
  })

  it("fails when interpolation placeholders drift from the base locale", async () => {
    const fixture = await createFixture({ placeholderMismatchLocale: "fr-FR" })

    await expect(generateI18nResources(fixture)).rejects.toThrow(/fr-FR\/ui\.yml placeholder mismatch at resultCount_other/)
  })
})
