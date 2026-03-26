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
        "catalog-card group flex h-full flex-col gap-4 rounded-[1.45rem] border p-4 text-left transition duration-200 sm:p-4.5",
        isActive
          ? "border-[color:var(--accent-strong)] bg-[color:var(--surface-highlight)] shadow-[var(--shadow-lift)]"
          : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] hover:-translate-y-0.5 hover:border-[color:var(--line-strong)] hover:shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.64rem] font-semibold uppercase tracking-[0.32em] text-[color:var(--muted-ink)]">
            {item.sourceLabel}
          </p>
          <h2 className="mt-2 font-display text-[1.55rem] leading-[1.05] text-[color:var(--ink-strong)] sm:text-[1.7rem]">
            <a className="outline-none" href={detailHref}>
              {item.name}
            </a>
          </h2>
        </div>
        <span className="rounded-full border border-[color:var(--line-soft)] bg-white/78 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">
          {typeLabel}
        </span>
      </div>

      <p className="text-sm leading-6 text-[color:var(--ink-soft)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
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

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color:var(--line-soft)]/80 pt-3 text-[0.78rem] text-[color:var(--muted-ink)]">
        <span className="truncate">{item.model ?? "model:n/a"}</span>
        <div className="flex items-center gap-2">
          <a className="secondary-link" href={detailHref}>
            {messages.viewCanonicalPage}
          </a>
          <button type="button" className="primary-button" onClick={() => onOpen(item.agentId, item.defaultLanguage)}>
            {isActive ? messages.activeCard : messages.quickView}
          </button>
        </div>
      </div>
    </article>
  )
}
