/** Canonical component groups in catalogue display order. */
export const componentGroups = [
  "Core",
  "Layout",
  "Display",
  "Forms",
  "Feedback",
  "Navigation",
  "People",
  "Agents",
  "Docs",
  "Marketing",
  "Editorial",
] as const;

/** Name of one canonical component group. */
export type ComponentGroup = (typeof componentGroups)[number];

/** Browser behaviors a component can ask the runtime emitter to include. */
export const componentBehaviors = ["floating-surface"] as const;
/** One selection-scoped browser behavior. */
export type ComponentBehavior = (typeof componentBehaviors)[number];

/** Authored identity, ordering, and accessibility facts for a component. */
export interface ComponentMeta {
  readonly name: string;
  readonly slug: string;
  readonly group: ComponentGroup;
  readonly order: number;
  readonly description: string;
  readonly behaviors?: readonly ComponentBehavior[];
  readonly accessibility?: readonly string[];
}
