import type { AgentCatalogItem, ContentLanguage } from "@/data/trait-catalog"
import type { LocaleMessages } from "@/i18n/locales/en"
import { humanizeCatalogValue } from "@/lib/trait-builder"

type AgentCardProps = {
  item: AgentCatalogItem
  isActive: boolean
  messages: LocaleMessages
  onOpen: (agentId: string, language: ContentLanguage | null) => void
}

export function AgentCard({ item, isActive, messages, onOpen }: AgentCardProps) {
  const typeLabel =
    item.type === "reviewer"
      ? messages.typeReviewer
      : item.type === "build-resolver"
        ? messages.typeBuildResolver
        : humanizeCatalogValue(item.type)

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onOpen(item.agentId, item.defaultLanguage)}
      className={[
        "catalog-card group flex h-full flex-col rounded-[1.7rem] border p-5 text-left transition duration-200",
        isActive
          ? "border-[color:var(--accent-strong)] bg-[color:var(--surface-highlight)] shadow-[0_18px_50px_rgba(145,67,36,0.18)]"
          : "border-[color:var(--line-soft)] bg-[color:var(--surface-card)] hover:-translate-y-1 hover:border-[color:var(--line-strong)] hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[color:var(--muted-ink)]">
            {item.sourceLabel}
          </p>
          <div>
            <h3 className="font-display text-2xl leading-tight text-[color:var(--ink-strong)]">{item.name}</h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--ink-soft)]">{item.summary}</p>
          </div>
        </div>
        <span className="rounded-full border border-[color:var(--line-soft)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--muted-ink)]">
          {typeLabel}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {item.availableLanguages.map((language) => (
          <span key={language} className="tag-chip">{language}</span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {item.tools.slice(0, 4).map((tool) => (
          <span key={tool} className="tool-chip">{tool}</span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-6 text-sm text-[color:var(--muted-ink)]">
        <span>{item.model ?? "model:n/a"}</span>
        <span className="font-semibold text-[color:var(--ink-strong)]">{isActive ? messages.activeCard : messages.openDetail}</span>
      </div>
    </button>
  )
}
