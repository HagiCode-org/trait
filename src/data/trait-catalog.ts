export type TraitCategory = "Drive" | "Rhythm" | "Social" | "Craft"

export type TraitItem = {
  id: string
  name: string
  archetype: string
  category: TraitCategory
  intensity: "Low" | "Medium" | "High"
  summary: string
  signals: string[]
  tension: string
  builderHint: string
}

export const traitCatalog: TraitItem[] = [
  {
    id: "cold-strategist",
    name: "Cold Strategist",
    archetype: "Drive",
    category: "Drive",
    intensity: "High",
    summary: "Operates on sequence, leverage, and timing instead of loud motivation.",
    signals: ["long-range planning", "quiet execution", "risk framing"],
    tension: "Can feel distant if warmth is never made explicit.",
    builderHint: "Pair with one social trait that makes the strategy readable to others.",
  },
  {
    id: "mercy-operator",
    name: "Mercy Operator",
    archetype: "Social",
    category: "Social",
    intensity: "Medium",
    summary: "Protective, observant, and gentle under pressure without collapsing standards.",
    signals: ["stable empathy", "boundary keeping", "repair instinct"],
    tension: "May absorb too much emotional debt if the role is undefined.",
    builderHint: "Use with a rhythm trait that prevents emotional overextension.",
  },
  {
    id: "ritual-architect",
    name: "Ritual Architect",
    archetype: "Rhythm",
    category: "Rhythm",
    intensity: "High",
    summary: "Builds repeatable systems that keep identity stable across chaotic weeks.",
    signals: ["template thinking", "energy budgeting", "maintenance loops"],
    tension: "Can become brittle when novelty arrives without warning.",
    builderHint: "Balance with a drive trait that tolerates improvisation.",
  },
  {
    id: "signal-poet",
    name: "Signal Poet",
    archetype: "Craft",
    category: "Craft",
    intensity: "Medium",
    summary: "Turns abstract mood into concise symbols, copy, and visual cues.",
    signals: ["image language", "compressed expression", "tone shaping"],
    tension: "May over-refine expression and delay a clear decision.",
    builderHint: "Works well when paired with a decisive drive trait.",
  },
  {
    id: "storm-reader",
    name: "Storm Reader",
    archetype: "Drive",
    category: "Drive",
    intensity: "Medium",
    summary: "Reads weak signals early and adjusts direction before the room notices.",
    signals: ["pattern sensing", "calm pivots", "context reading"],
    tension: "Can look overly cautious when evidence is still incomplete.",
    builderHint: "Use with a craft trait to explain the intuition to collaborators.",
  },
  {
    id: "velvet-boundary",
    name: "Velvet Boundary",
    archetype: "Social",
    category: "Social",
    intensity: "High",
    summary: "Warm in tone, exact in limits, and hard to push off center.",
    signals: ["clear no", "respectful distance", "composed care"],
    tension: "Can be misread as aloof if context is not shared.",
    builderHint: "Great for personas that need elegance without softness collapse.",
  },
  {
    id: "deep-work-monk",
    name: "Deep Work Monk",
    archetype: "Rhythm",
    category: "Rhythm",
    intensity: "High",
    summary: "Protects long focus windows and treats attention as a sacred resource.",
    signals: ["focus blocks", "stimulus control", "single-threaded progress"],
    tension: "Can disappear from the social layer for too long.",
    builderHint: "Pair with a social trait that restores visibility and trust.",
  },
  {
    id: "soft-provocateur",
    name: "Soft Provocateur",
    archetype: "Craft",
    category: "Craft",
    intensity: "Low",
    summary: "Challenges old frames through subtle questions instead of confrontation.",
    signals: ["framing shifts", "careful critique", "gentle disruption"],
    tension: "May be too understated in high-noise environments.",
    builderHint: "Combine with a stronger drive trait when you need decisive momentum.",
  },
  {
    id: "aftermath-keeper",
    name: "Aftermath Keeper",
    archetype: "Social",
    category: "Social",
    intensity: "Low",
    summary: "Stays after the moment, closes loops, and repairs what others forget.",
    signals: ["follow-through", "care logistics", "quiet loyalty"],
    tension: "Can feel invisible because the work happens after the spotlight.",
    builderHint: "Pair with a visible craft trait if you want the care to be legible.",
  },
  {
    id: "precision-editor",
    name: "Precision Editor",
    archetype: "Craft",
    category: "Craft",
    intensity: "High",
    summary: "Refines language, structure, and interfaces until the signal becomes clean.",
    signals: ["sharp taste", "micro-iteration", "clarity pressure"],
    tension: "Perfection can slow launch velocity.",
    builderHint: "Match with a rhythm trait that defines when refinement stops.",
  },
  {
    id: "kinetic-sprinter",
    name: "Kinetic Sprinter",
    archetype: "Drive",
    category: "Drive",
    intensity: "High",
    summary: "Builds heat fast, prototypes early, and learns by moving first.",
    signals: ["fast experiments", "bias to action", "visible momentum"],
    tension: "Can outrun reflection and make the story incoherent.",
    builderHint: "Needs one rhythm trait to keep speed from becoming noise.",
  },
  {
    id: "threshold-gardener",
    name: "Threshold Gardener",
    archetype: "Rhythm",
    category: "Rhythm",
    intensity: "Medium",
    summary: "Designs entry rituals that make hard work feel emotionally safe to begin.",
    signals: ["gentle starts", "environment design", "friction shaping"],
    tension: "Can spend too long perfecting the setup instead of starting.",
    builderHint: "Pair with a drive trait that commits to a finish line.",
  },
]

export const traitCategories: TraitCategory[] = ["Drive", "Rhythm", "Social", "Craft"]
