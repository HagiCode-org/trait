import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type MarkdownArticleProps = {
  body: string
}

export function MarkdownArticle({ body }: MarkdownArticleProps) {
  return (
    <div className="agent-markdown space-y-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          h4: ({ children }) => <h4>{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}
