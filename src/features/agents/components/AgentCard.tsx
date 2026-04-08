import type { AgentCatalogItem, ContentLanguage } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"
import { buildAgentPath, humanizeCatalogValue } from "@/lib/route-projection"

type AgentCardProps = {
  item: AgentCatalogItem
  isActive: boolean
  messages: LocaleMessages
  onOpen: (agentId: string, language: ContentLanguage | null) => void
}

const MAX_VISIBLE_TOOLS = 3

export function AgentCard({ item, isActive, messages, onOpen }: AgentCardProps) {
  const typeLabel =
    item.type === "reviewer"
      ? messages.typeReviewer
      : item.type === "build-resolver"
        ? messages.typeBuildResolver
        : humanizeCatalogValue(item.type)
  const visibleTools = item.tools.slice(0, MAX_VISIBLE_TOOLS)
  const overflowTools = Math.max(0, item.tools.length - visibleTools.length)
  const detailHref = buildAgentPath(item.agentId)

  return (
    <article
      aria-current={isActive ? "true" : undefined}
      data-agent-card-id={item.agentId}
      className={[
        "catalog-card group flex h-full flex-col gap-5 rounded-[1.75rem] border p-5 text-left transition duration-200",
        isActive
          ? "border-[color:var(--surface-contrast)] bg-[color:var(--surface-highlight)]"
          : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] hover:-translate-y-0.5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[color:var(--muted-ink)]">
            {item.sourceLabel}
          </p>
          <h2 className="mt-3 font-display text-[1.9rem] leading-[0.98] tracking-[-0.04em] text-[color:var(--ink-strong)]">
            <a className="outline-none" href={detailHref}>
              {item.name}
            </a>
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--line-soft)] bg-[color:var(--surface-muted)] px-3 py-1.5 font-display text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[color:var(--ink-soft)]">
          {typeLabel}
        </span>
      </div>

      <p className="text-sm leading-7 text-[color:var(--ink-soft)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
        {item.summary}
      </p>

      <div className="flex flex-wrap gap-2">
        {item.availableLanguages.map((language) => (
          <span key={language} className="tag-chip">
            {language}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" data-tool-preview-count={String(visibleTools.length)}>
        {visibleTools.map((tool) => (
          <span key={tool} className="tool-chip" data-tool-chip>
            {tool}
          </span>
        ))}
        {overflowTools > 0 ? <span className="tool-chip">+{overflowTools}</span> : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color:var(--line-soft)] pt-4 text-[0.78rem] text-[color:var(--muted-ink)]">
        <span className="truncate">{item.model ?? "model:n/a"}</span>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <a className="secondary-link !min-h-0 !px-4 !py-2 !text-[0.78rem]" href={detailHref}>
            {messages.viewCanonicalPage}
          </a>
          <button type="button" className="primary-button !min-h-0 !px-4 !py-2 !text-[0.78rem]" onClick={() => onOpen(item.agentId, item.defaultLanguage)}>
            {isActive ? messages.activeCard : messages.quickView}
          </button>
        </div>
      </div>
    </article>
  )
}
