import { traitCatalog, type TraitCategory, type TraitItem } from "@/data/trait-catalog"

export type BuilderDraft = {
  title: string
  goal: string
  narrative: string
  selectedIds: string[]
}

export function filterTraits(options: {
  query: string
  category: TraitCategory | "All"
}) {
  const normalizedQuery = options.query.trim().toLowerCase()

  return traitCatalog.filter((trait) => {
    const matchesCategory = options.category === "All" || trait.category === options.category
    if (!matchesCategory) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const haystack = [
      trait.name,
      trait.archetype,
      trait.summary,
      trait.tension,
      trait.builderHint,
      ...trait.signals,
    ]
      .join(" ")
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}

export function getSelectedTraits(selectedIds: string[]) {
  const order = new Map(selectedIds.map((id, index) => [id, index]))

  return traitCatalog
    .filter((trait) => order.has(trait.id))
    .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
}

export function toggleSelection(selectedIds: string[], traitId: string) {
  return selectedIds.includes(traitId)
    ? selectedIds.filter((id) => id !== traitId)
    : [...selectedIds, traitId]
}

function formatTraitBlock(trait: TraitItem) {
  return [
    `- ${trait.name} [${trait.category}/${trait.intensity}]`,
    `  Signal: ${trait.summary}`,
    `  Behaviors: ${trait.signals.join(", ")}`,
    `  Risk: ${trait.tension}`,
    `  Composition hint: ${trait.builderHint}`,
  ].join("\n")
}

export function buildBlueprint(draft: BuilderDraft) {
  const selectedTraits = getSelectedTraits(draft.selectedIds)

  const header = draft.title.trim() || "Untitled Trait Stack"
  const goal = draft.goal.trim() || "Define a persona with clear edges and usable behavior cues."
  const narrative = draft.narrative.trim() || "Compose a self that feels internally coherent, calm, and buildable over time."

  const traitBlock =
    selectedTraits.length > 0
      ? selectedTraits.map((trait) => formatTraitBlock(trait)).join("\n\n")
      : "- No traits selected yet. Add two or three signals to make the blueprint useful."

  return [
    `Trait Stack: ${header}`,
    "",
    `Goal: ${goal}`,
    `Narrative frame: ${narrative}`,
    "",
    "Selected traits:",
    traitBlock,
    "",
    "Synthesis:",
    "Write this persona as someone who carries precision, emotional logic, and explicit behavioral limits.",
    "Describe how the selected traits cooperate under pressure, where they conflict, and what rituals keep them stable.",
    "End with three implementation notes: social signal, work rhythm, and aesthetic cue.",
  ].join("\n")
}
