import { describe, expect, it } from "vitest"

import { buildBlueprint, filterTraits, toggleSelection } from "./trait-builder"

describe("trait builder helpers", () => {
  it("filters by query and category", () => {
    const result = filterTraits({ query: "focus", category: "Rhythm" })
    expect(result.map((trait) => trait.id)).toContain("deep-work-monk")
    expect(result.every((trait) => trait.category === "Rhythm")).toBe(true)
  })

  it("toggles selection in stable order", () => {
    expect(toggleSelection(["a", "b"], "b")).toEqual(["a"])
    expect(toggleSelection(["a"], "b")).toEqual(["a", "b"])
  })

  it("builds a readable blueprint", () => {
    const blueprint = buildBlueprint({
      title: "Quiet Commander",
      goal: "Lead with calm force.",
      narrative: "Precise and soft at the same time.",
      selectedIds: ["cold-strategist", "velvet-boundary"],
    })

    expect(blueprint).toContain("Trait Stack: Quiet Commander")
    expect(blueprint).toContain("Cold Strategist")
    expect(blueprint).toContain("Velvet Boundary")
  })
})
