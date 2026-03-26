// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { MarkdownArticle } from "./MarkdownArticle"

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const actEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}

describe("MarkdownArticle", () => {
  beforeEach(() => {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false
  })

  it("renders mature markdown features through react-markdown", () => {
    const body = [
      "# Title",
      "",
      "A paragraph with a [link](https://example.com).",
      "",
      "- first",
      "- second",
      "",
      "| name | value |",
      "| --- | --- |",
      "| alpha | beta |",
      "",
      "```ts",
      "const answer = 42",
      "```",
    ].join("\n")

    act(() => {
      root.render(<MarkdownArticle body={body} />)
    })

    expect(container.querySelector("h2")?.textContent).toBe("Title")
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com")
    expect(container.querySelectorAll("li")).toHaveLength(2)
    expect(container.querySelector("table")).not.toBeNull()
    expect(container.querySelector("code")?.textContent).toContain("const answer = 42")
  })
})
