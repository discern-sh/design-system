import type { GlyphName } from "../../../src/glyphs/mod.ts";

/** One published name playing a stated role inside an interaction set. */
export interface GlyphMeaningSetMember {
  readonly name: GlyphName;
  readonly role: string;
}

/** A group of published names that change together in one interaction. */
export interface GlyphMeaningSet {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly members: readonly GlyphMeaningSetMember[];
}

/**
 * Editorial grouping of existing published aliases into the interaction sets
 * an interface swaps between. Only names and role labels live here; every
 * glyph fact — sequence, width, fallback, presentation — resolves through the
 * public `./glyphs` authority and the Atlas at render time.
 */
export const glyphMeaningSets: readonly GlyphMeaningSet[] = [
  {
    id: "selection-state",
    title: "Selection state",
    description:
      "One control, three answers: an option moves between these marks as " +
      "its selection changes, so the three must stay distinguishable.",
    members: [
      { name: "selection-selected", role: "Selected" },
      { name: "selection-unselected", role: "Unselected" },
      { name: "selection-mixed", role: "Mixed" },
    ],
  },
  {
    id: "favourite-toggle",
    title: "Favourite toggle",
    description:
      "The filled and outlined star are the two states of one toggle, not " +
      "two decorations.",
    members: [
      { name: "favorite-selected", role: "Favourited" },
      { name: "favorite-unselected", role: "Not favourited" },
    ],
  },
  {
    id: "disclosure-state",
    title: "Disclosure state",
    description:
      "A disclosure control points right while collapsed and down while " +
      "expanded; the pair reads as one rotating affordance.",
    members: [
      { name: "disclosure-down", role: "Expanded" },
      { name: "disclosure-right", role: "Collapsed" },
    ],
  },
  {
    id: "direction",
    title: "Directional relationships",
    description:
      "The four arrows pair off as previous/next and up/down; keep opposite " +
      "directions visually and semantically symmetric.",
    members: [
      { name: "arrow-left", role: "Left · previous" },
      { name: "arrow-right", role: "Right · next" },
      { name: "arrow-up", role: "Up" },
      { name: "arrow-down", role: "Down" },
    ],
  },
  {
    id: "history",
    title: "History",
    description:
      "Undo and redo are mirrored curves over the same action history; they " +
      "appear together or not at all.",
    members: [
      { name: "undo", role: "Undo" },
      { name: "redo", role: "Redo" },
    ],
  },
  {
    id: "appearance-toggle",
    title: "Appearance toggle",
    description:
      "The sun and moon name the light and dark appearance of one switch; " +
      "each shows the appearance it activates.",
    members: [
      { name: "theme-light", role: "Light appearance" },
      { name: "theme-dark", role: "Dark appearance" },
    ],
  },
];

/** Sets that include any of the given published alias names. */
export function glyphMeaningSetsForAliasNames(
  names: readonly string[],
): readonly GlyphMeaningSet[] {
  return glyphMeaningSets.filter((set) =>
    set.members.some((member) => names.includes(member.name))
  );
}
