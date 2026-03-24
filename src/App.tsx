import { useEffect, useMemo, useState } from "react"

import { traitCatalog, traitCategories, type TraitCategory } from "@/data/trait-catalog"
import { buildBlueprint, filterTraits, getSelectedTraits, toggleSelection } from "@/lib/trait-builder"

const STORAGE_KEY = "trait-builder-draft"

type DraftState = {
  title: string
  goal: string
  narrative: string
  selectedIds: string[]
}

const defaultDraft: DraftState = {
  title: "Quiet Pressure / Visible Shape",
  goal: "Build a persona that can be searched, understood, and steadily embodied online.",
  narrative: "Elegant under pressure, emotionally legible, and able to move from thought to action without losing control.",
  selectedIds: ["cold-strategist", "velvet-boundary", "precision-editor"],
}

function readStoredDraft(): DraftState {
  if (typeof window === "undefined") {
    return defaultDraft
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return defaultDraft
    }

    const parsed = JSON.parse(raw) as Partial<DraftState>
    return {
      title: parsed.title ?? defaultDraft.title,
      goal: parsed.goal ?? defaultDraft.goal,
      narrative: parsed.narrative ?? defaultDraft.narrative,
      selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds : defaultDraft.selectedIds,
    }
  } catch {
    return defaultDraft
  }
}

export default function App() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<TraitCategory | "All">("All")
  const [draft, setDraft] = useState<DraftState>(() => readStoredDraft())
  const [copied, setCopied] = useState(false)

  const filteredTraits = useMemo(
    () => filterTraits({ query, category }),
    [category, query]
  )

  const selectedTraits = useMemo(
    () => getSelectedTraits(draft.selectedIds),
    [draft.selectedIds]
  )

  const blueprint = useMemo(
    () => buildBlueprint(draft),
    [draft]
  )

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  useEffect(() => {
    if (!copied) {
      return undefined
    }

    const timer = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(blueprint)
      setCopied(true)
    } catch (error) {
      console.warn("Copy failed", error)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(197,255,193,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(248,223,177,0.18),transparent_20%),radial-gradient(circle_at_50%_72%,rgba(113,164,128,0.16),transparent_28%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:36px_36px]" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        <header className="mb-10 flex flex-col gap-5 rounded-[2rem] border border-white/10 bg-white/6 px-5 py-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-100/70">HagiCode / Trait Builder</p>
            <h1 className="font-display text-3xl tracking-tight text-white sm:text-4xl">Search the self you can actually build.</h1>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm text-emerald-50/85 sm:min-w-[22rem]">
            <MetricCard label="Traits indexed" value={String(traitCatalog.length).padStart(2, "0")} />
            <MetricCard label="Selected" value={String(selectedTraits.length).padStart(2, "0")} />
            <MetricCard label="Modes" value="04" />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <p className="text-sm uppercase tracking-[0.32em] text-emerald-100/65">Search / Compose / Export</p>
                <h2 className="font-display text-4xl leading-none text-white sm:text-6xl">
                  A searchable trait atlas for online identity design.
                </h2>
                <p className="max-w-xl text-sm leading-7 text-emerald-50/75 sm:text-base">
                  Start from searchable signals, stack compatible traits, and draft a persona blueprint that stays usable in writing, branding, and self-direction.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-emerald-50/75 sm:grid-cols-2 lg:max-w-xs">
                <SignalBadge label="Search semantics" value="Name, tension, signals" />
                <SignalBadge label="Build mode" value="Trait stack with synthesis" />
                <SignalBadge label="Output" value="Copy-ready blueprint" />
                <SignalBadge label="Persistence" value="Local draft restore" />
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-amber-200/10 bg-[linear-gradient(180deg,rgba(255,246,224,0.08),rgba(18,38,29,0.4))] p-6 backdrop-blur-xl sm:p-8">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-100/65">Composition Logic</p>
            <ol className="mt-5 space-y-4 text-sm leading-7 text-amber-50/78">
              <li><span className="text-amber-200">01</span> Search by behavior signal, not just mood word.</li>
              <li><span className="text-amber-200">02</span> Mix one drive trait, one social edge, and one stabilizing rhythm.</li>
              <li><span className="text-amber-200">03</span> Keep tensions visible so the persona feels human instead of flat.</li>
              <li><span className="text-amber-200">04</span> Export a blueprint you can reuse in prompts, bios, or product voice.</li>
            </ol>
          </aside>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-100/65">Trait Search</p>
                <h3 className="mt-2 font-display text-3xl text-white">Find signals before aesthetics.</h3>
              </div>
              <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-emerald-50/80">
                {filteredTraits.length} matches
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="group flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 focus-within:border-emerald-200/40">
                <span className="text-xs uppercase tracking-[0.3em] text-emerald-100/55">Query</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="search focus, clarity, empathy, strategy..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-emerald-50/28"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setCategory("All")
                }}
                className="rounded-[1.4rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white transition hover:bg-white/14"
              >
                Reset filters
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <FilterChip active={category === "All"} onClick={() => setCategory("All")}>All</FilterChip>
              {traitCategories.map((item) => (
                <FilterChip key={item} active={category === item} onClick={() => setCategory(item)}>
                  {item}
                </FilterChip>
              ))}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {filteredTraits.map((trait) => {
                const selected = draft.selectedIds.includes(trait.id)

                return (
                  <button
                    key={trait.id}
                    type="button"
                    onClick={() => setDraft((current) => ({
                      ...current,
                      selectedIds: toggleSelection(current.selectedIds, trait.id),
                    }))}
                    className={[
                      "group rounded-[1.7rem] border p-5 text-left transition duration-200",
                      selected
                        ? "border-emerald-200/40 bg-emerald-100/10 shadow-[0_18px_60px_rgba(76,122,87,0.22)]"
                        : "border-white/10 bg-black/18 hover:border-white/20 hover:bg-white/8",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-emerald-100/55">{trait.category} / {trait.intensity}</p>
                        <h4 className="mt-2 font-display text-2xl text-white">{trait.name}</h4>
                        <p className="mt-3 text-sm leading-7 text-emerald-50/74">{trait.summary}</p>
                      </div>
                      <span className={[
                        "mt-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs uppercase tracking-[0.2em]",
                        selected ? "border-emerald-200/40 bg-emerald-100/18 text-emerald-50" : "border-white/10 text-emerald-100/55",
                      ].join(" ")}>
                        {selected ? "On" : "Add"}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {trait.signals.map((signal) => (
                        <span key={signal} className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-emerald-50/72">
                          {signal}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 rounded-[1.2rem] border border-amber-200/10 bg-amber-100/6 p-3 text-sm leading-6 text-amber-50/74">
                      <strong className="mr-1 text-amber-100">Tension:</strong>
                      {trait.tension}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="grid gap-6">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,24,19,0.82),rgba(8,15,12,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-6">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-emerald-100/65">Self Build</p>
                  <h3 className="mt-2 font-display text-3xl text-white">Shape the stack.</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(defaultDraft)}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-emerald-50/75 transition hover:bg-white/10"
                >
                  Restore seed
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <Field label="Stack title">
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    className="h-12 w-full rounded-[1.2rem] border border-white/10 bg-white/6 px-4 text-sm text-white outline-none placeholder:text-emerald-50/30 focus:border-emerald-200/35"
                    placeholder="Name the identity stack"
                  />
                </Field>
                <Field label="Goal">
                  <textarea
                    value={draft.goal}
                    onChange={(event) => setDraft((current) => ({ ...current, goal: event.target.value }))}
                    className="min-h-24 w-full rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-emerald-50/30 focus:border-emerald-200/35"
                    placeholder="What should this persona do in the world?"
                  />
                </Field>
                <Field label="Narrative frame">
                  <textarea
                    value={draft.narrative}
                    onChange={(event) => setDraft((current) => ({ ...current, narrative: event.target.value }))}
                    className="min-h-28 w-full rounded-[1.2rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-emerald-50/30 focus:border-emerald-200/35"
                    placeholder="Describe the emotional and aesthetic logic."
                  />
                </Field>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm uppercase tracking-[0.32em] text-emerald-100/62">Selected traits</p>
                  <span className="text-sm text-emerald-50/72">{selectedTraits.length} active</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedTraits.length > 0 ? selectedTraits.map((trait) => (
                    <button
                      key={trait.id}
                      type="button"
                      onClick={() => setDraft((current) => ({
                        ...current,
                        selectedIds: current.selectedIds.filter((id) => id !== trait.id),
                      }))}
                      className="rounded-full border border-emerald-200/28 bg-emerald-100/10 px-3 py-1.5 text-sm text-emerald-50 transition hover:bg-emerald-100/16"
                    >
                      {trait.name}
                    </button>
                  )) : (
                    <p className="text-sm text-emerald-50/55">Pick traits from the atlas to start composing.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-100/10 bg-[linear-gradient(180deg,rgba(255,248,232,0.08),rgba(26,17,5,0.44))] p-5 backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-amber-100/65">Blueprint Output</p>
                  <h3 className="mt-2 font-display text-3xl text-white">Copy-ready synthesis.</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="rounded-full border border-amber-200/20 bg-amber-100/10 px-4 py-2 text-sm text-amber-50 transition hover:bg-amber-100/16"
                >
                  {copied ? "Copied" : "Copy blueprint"}
                </button>
              </div>
              <pre className="mt-5 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-black/28 p-4 text-sm leading-7 whitespace-pre-wrap text-amber-50/82">
                {blueprint}
              </pre>
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-black/18 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/50">{label}</p>
      <p className="mt-2 font-display text-2xl text-white">{value}</p>
    </div>
  )
}

function SignalBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-white/10 bg-black/18 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-100/50">{label}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-emerald-200/35 bg-emerald-100/12 text-white"
          : "border-white/10 bg-black/18 text-emerald-50/70 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-2 text-sm uppercase tracking-[0.3em] text-emerald-100/58">{label}</p>
      {children}
    </label>
  )
}
