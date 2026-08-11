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
  "Workflow",
  "Docs",
  "Marketing",
  "Editorial",
] as const;

/** Name of one canonical component group. */
export type ComponentGroup = (typeof componentGroups)[number];

/** Closed set of task-oriented collections exposed by the Catalogue. */
export const cataloguePurposes = [
  "building-documentation",
  "displaying-tool-output",
  "procedural-workflow",
  "marketing-site",
] as const;

/** One task-oriented Catalogue collection. */
export type CataloguePurpose = (typeof cataloguePurposes)[number];

/** Browser behaviors a component can ask the runtime emitter to include. */
export const componentBehaviors = ["floating-surface"] as const;
/** One selection-scoped browser behavior. */
export type ComponentBehavior = (typeof componentBehaviors)[number];

/**
 * Components deliberately allowed to make one browser behavior part of a
 * resolved runtime. Release tests compare Metadata with this opt-in authority.
 */
export const componentBehaviorOptIns = {
  "floating-surface": ["tooltip", "hover-card"],
} as const satisfies Readonly<Record<ComponentBehavior, readonly string[]>>;

/** CLI stance for a component with a package-owned pure renderer. */
export interface CliRenderedComponentStance {
  readonly stance: "rendered";
}

/** CLI stance for a component that intentionally has no terminal equivalent. */
export interface CliExemptComponentStance {
  readonly stance: "exempt";
  readonly reason: string;
}

/** A component's declared rendered or exempt CLI contract. */
export type ComponentCliStance =
  | CliRenderedComponentStance
  | CliExemptComponentStance;

/** Authored identity, ordering, discovery, and accessibility facts for a component. */
export interface ComponentMeta {
  readonly name: string;
  readonly slug: string;
  readonly group: ComponentGroup;
  readonly order: number;
  readonly description: string;
  /** Task-oriented Catalogue collections in which this component belongs. */
  readonly purposes?: readonly CataloguePurpose[];
  /** Concrete situations in which this component is the right choice. */
  readonly useWhen?: readonly string[];
  /** Concrete situations better served by another component or pattern. */
  readonly notWhen?: readonly string[];
  /** Required terminal contract: render this Component or record why it is exempt. */
  readonly cli: ComponentCliStance;
  readonly behaviors?: readonly ComponentBehavior[];
  readonly accessibility?: readonly string[];
}
