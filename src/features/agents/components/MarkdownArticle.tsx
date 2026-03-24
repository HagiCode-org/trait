import { Fragment } from "react"

type MarkdownArticleProps = {
  body: string
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; code: string }

export function MarkdownArticle({ body }: MarkdownArticleProps) {
  const blocks = parseMarkdown(body)

  return (
    <div className="agent-markdown space-y-5">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return <h2 key={index}>{block.text}</h2>
            }
            if (block.level === 2) {
              return <h3 key={index}>{block.text}</h3>
            }
            return <h4 key={index}>{block.text}</h4>
          }
          case "paragraph":
            return <p key={index}>{renderInlineCode(block.text)}</p>
          case "list":
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{renderInlineCode(item)}</li>
                ))}
              </ul>
            )
          case "code":
            return (
              <pre key={index}>
                <code data-language={block.language || undefined}>{block.code}</code>
              </pre>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n")
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index].trimEnd()
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }
      index += 1
      blocks.push({ type: "code", language, code: codeLines.join("\n") })
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      })
      index += 1
      continue
    }

    if (/^([-*]|\d+\.)\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*([-*]|\d+\.)\s+/, "").trim())
        index += 1
      }
      blocks.push({ type: "list", items })
      continue
    }

    const paragraphLines: string[] = []
    while (index < lines.length) {
      const currentLine = lines[index].trim()
      if (!currentLine) {
        break
      }
      if (currentLine.startsWith("```") || /^(#{1,3})\s+/.test(currentLine) || /^([-*]|\d+\.)\s+/.test(currentLine)) {
        break
      }
      paragraphLines.push(currentLine)
      index += 1
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") })
  }

  return blocks
}

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }

    return <Fragment key={index}>{part}</Fragment>
  })
}
