/** Registry-derived rendered-structure policy for every accepted Builder tree. */
import type { PropControl } from "../controls.ts";
import type {
  BuilderDocument,
  BuilderNode,
  BuilderSlotChild,
} from "../model.ts";

export type BuilderRootContent = "phrasing" | "flow" | "unknown";
export type BuilderInteractivePosture =
  | "always"
  | "when-href"
  | "never"
  | "unknown";
export type BuilderSlotContent =
  | "any"
  | "phrasing"
  | "element"
  | "native-table";

/** Small Catalogue-only facts for semantics source prop types cannot express. */
export interface BuilderCompatibilityOverride {
  readonly rootContent?: BuilderRootContent;
  readonly interactive?: BuilderInteractivePosture;
  readonly slots?: Readonly<Record<string, BuilderSlotContent>>;
  readonly defaultComponents?: Readonly<Record<string, string>>;
}

export interface BuilderCompatibilitySource {
  readonly slug: string;
  readonly name: string;
  readonly inheritedTypes: readonly string[];
  readonly propNames: ReadonlySet<string>;
  readonly controls: readonly PropControl[];
  readonly override?: BuilderCompatibilityOverride;
}

export interface BuilderSlotCompatibility {
  readonly name: string;
  readonly label: string;
  readonly required: boolean;
  readonly content: BuilderSlotContent;
  readonly defaultComponentSlug?: string;
}

export interface BuilderComponentCompatibility {
  readonly slug: string;
  readonly name: string;
  readonly rootContent: BuilderRootContent;
  readonly interactive: BuilderInteractivePosture;
  readonly slots: ReadonlyMap<string, BuilderSlotCompatibility>;
}

/** One future-enrolling compatibility inventory consumed by every boundary. */
export interface BuilderCompatibilityPolicy {
  readonly bySlug: ReadonlyMap<string, BuilderComponentCompatibility>;
}

export interface BuilderPlacementFailure {
  readonly humanPath: string;
  readonly reason: string;
  readonly technicalDetail: string;
  readonly suggestions: readonly string[];
}

export type BuilderStructurePreflight =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: BuilderPlacementFailure };

/** A structured refusal retained by placement UI and inert-data boundaries. */
export class BuilderPlacementError extends Error {
  override readonly name = "BuilderPlacementError";

  constructor(readonly failure: BuilderPlacementFailure) {
    super(`${failure.humanPath} ${failure.reason}.`);
  }
}

const PHRASING_ROOTS = new Set([
  "icon",
  "logo",
  "button",
  "icon-button",
  "badge",
  "tag",
  "kicker",
  "mention",
  "agent-mention",
  "input",
  "select",
  "textarea",
  "checkbox",
  "radio",
  "switch",
]);

const ALWAYS_INTERACTIVE = new Set([
  "button",
  "icon-button",
  "theme-toggle",
  "theme-switcher",
  "input",
  "select",
  "textarea",
  "checkbox",
  "radio",
  "switch",
]);

const DECLARED_OVERRIDES: Readonly<
  Record<string, BuilderCompatibilityOverride>
> = {
  button: {
    rootContent: "phrasing",
    interactive: "always",
    slots: {
      children: "phrasing",
      leadingIcon: "phrasing",
      trailingIcon: "phrasing",
    },
  },
  heading: { slots: { children: "phrasing" } },
  paragraph: { slots: { children: "phrasing" } },
  table: { slots: { children: "native-table" } },
  tooltip: { defaultComponents: { children: "button" } },
  "hover-card": { defaultComponents: { trigger: "button" } },
};

const NATIVE_INTERACTIVE_TYPES = new Set([
  "AnchorHTMLAttributes",
  "ButtonHTMLAttributes",
  "InputHTMLAttributes",
  "SelectHTMLAttributes",
  "TextareaHTMLAttributes",
]);

function mergeOverride(
  slug: string,
  override: BuilderCompatibilityOverride | undefined,
): BuilderCompatibilityOverride {
  const declared = DECLARED_OVERRIDES[slug];
  return {
    ...(declared ?? {}),
    ...(override ?? {}),
    slots: { ...(declared?.slots ?? {}), ...(override?.slots ?? {}) },
    defaultComponents: {
      ...(declared?.defaultComponents ?? {}),
      ...(override?.defaultComponents ?? {}),
    },
  };
}

function derivedRootContent(
  source: BuilderCompatibilitySource,
  override: BuilderCompatibilityOverride,
): BuilderRootContent {
  if (override.rootContent !== undefined) return override.rootContent;
  if (
    PHRASING_ROOTS.has(source.slug) ||
    source.inheritedTypes.some((type) => NATIVE_INTERACTIVE_TYPES.has(type))
  ) return "phrasing";
  return "unknown";
}

function derivedInteractive(
  source: BuilderCompatibilitySource,
  override: BuilderCompatibilityOverride,
): BuilderInteractivePosture {
  if (override.interactive !== undefined) return override.interactive;
  if (
    ALWAYS_INTERACTIVE.has(source.slug) ||
    source.inheritedTypes.some((type) => NATIVE_INTERACTIVE_TYPES.has(type))
  ) return "always";
  if (source.propNames.has("href")) return "when-href";
  return "unknown";
}

function derivedSlotContent(
  control: Extract<PropControl, { control: "slot" }>,
  override: BuilderCompatibilityOverride,
): BuilderSlotContent {
  const declared = override.slots?.[control.name];
  if (declared !== undefined) return declared;
  if (control.elementOnly) return "element";
  if (/\bphrasing content\b/i.test(control.description ?? "")) {
    return "phrasing";
  }
  return "any";
}

/** Derive every Component fact; missing future facts remain fail-closed. */
export function deriveBuilderCompatibilityPolicy(
  sources: readonly BuilderCompatibilitySource[],
): BuilderCompatibilityPolicy {
  return {
    bySlug: new Map(sources.map((source) => {
      const override = mergeOverride(source.slug, source.override);
      const slots = source.controls.flatMap((control) =>
        control.control === "slot"
          ? [{
            name: control.name,
            label: control.label,
            required: control.required,
            content: derivedSlotContent(control, override),
            ...(override.defaultComponents?.[control.name] === undefined
              ? {}
              : {
                defaultComponentSlug: override.defaultComponents[control.name],
              }),
          }]
          : []
      );
      return [
        source.slug,
        Object.freeze({
          slug: source.slug,
          name: source.name,
          rootContent: derivedRootContent(source, override),
          interactive: derivedInteractive(source, override),
          slots: new Map(slots.map((slot) => [slot.name, slot])),
        }),
      ] as const;
    })),
  };
}

function scalarString(node: BuilderNode, name: string): string | undefined {
  const value = node.props[name];
  if (value?.kind === "string") return value.value;
  if (node.extra === undefined) return undefined;
  try {
    const extra: unknown = JSON.parse(node.extra);
    if (typeof extra !== "object" || extra === null || Array.isArray(extra)) {
      return undefined;
    }
    const member = (extra as Record<string, unknown>)[name];
    return typeof member === "string" ? member : undefined;
  } catch {
    return undefined;
  }
}

function isInteractive(
  node: BuilderNode,
  fact: BuilderComponentCompatibility,
): boolean | undefined {
  if (fact.interactive === "always") return true;
  if (fact.interactive === "never") return false;
  if (fact.interactive === "when-href") {
    return (scalarString(node, "href")?.trim().length ?? 0) > 0;
  }
  return undefined;
}

function failure(
  humanPath: string,
  reason: string,
  technicalDetail: string,
): BuilderStructurePreflight {
  return {
    ok: false,
    failure: { humanPath, reason, technicalDetail, suggestions: [] },
  };
}

function childPath(
  ownerPath: string,
  slot: BuilderSlotCompatibility,
  child: BuilderSlotChild,
  policy: BuilderCompatibilityPolicy,
): string {
  const label = child.kind === "text"
    ? "Text"
    : policy.bySlug.get(child.slug)?.name ?? child.slug;
  return slot.name === "children"
    ? `${ownerPath} › ${label}`
    : `${ownerPath} › ${slot.label} › ${label}`;
}

interface VisitTask {
  readonly node: BuilderNode;
  readonly path: string;
  readonly interactiveAncestor:
    | { readonly name: string; readonly path: string }
    | undefined;
}

/** Evaluate required slots, content models, and the complete ancestor chain. */
export function preflightBuilderStructure(
  document: BuilderDocument,
  policy: BuilderCompatibilityPolicy,
): BuilderStructurePreflight {
  const stack: VisitTask[] = [];
  for (let index = document.children.length - 1; index >= 0; index -= 1) {
    const child = document.children[index];
    if (child?.kind === "component") {
      const name = policy.bySlug.get(child.slug)?.name ?? child.slug;
      stack.push({ node: child, path: name, interactiveAncestor: undefined });
    }
  }

  while (stack.length > 0) {
    const task = stack.pop();
    if (task === undefined) break;
    const fact = policy.bySlug.get(task.node.slug);
    if (fact === undefined) {
      return failure(
        task.path,
        "cannot be accepted because its Builder compatibility facts are missing",
        `No compatibility entry enrolled slug ${
          JSON.stringify(task.node.slug)
        }`,
      );
    }
    const interactive = isInteractive(task.node, fact);
    if (task.interactiveAncestor !== undefined && interactive !== false) {
      const reason = interactive === true
        ? `cannot be placed inside ${task.interactiveAncestor.name} because interactive controls cannot contain interactive controls`
        : `cannot be placed inside ${task.interactiveAncestor.name} because its interactive posture is not declared safe`;
      return failure(
        task.path,
        reason,
        `${fact.slug} resolved interactive posture ${
          String(interactive)
        } under ${task.interactiveAncestor.path}`,
      );
    }

    for (const [name, value] of Object.entries(task.node.props)) {
      if (value.kind !== "slot") continue;
      if (!fact.slots.has(name)) {
        return failure(
          `${task.path} › ${fact.slots.get(name)?.label ?? name}`,
          "cannot hold children because the prop is not a Component slot",
          `${fact.slug}.${name} is not a registry-derived ReactNode or ReactElement control`,
        );
      }
    }

    for (const slot of fact.slots.values()) {
      const value = task.node.props[slot.name];
      if (value !== undefined && value.kind !== "slot") {
        return failure(
          `${task.path} › ${slot.label}`,
          "must hold Builder children rather than a scalar value",
          `${fact.slug}.${slot.name} is registry-derived as a slot`,
        );
      }
      const children = value?.kind === "slot" ? value.children : [];
      if (
        slot.required && slot.content === "element" && children.length === 0
      ) {
        return failure(
          `${task.path} › ${slot.label}`,
          "requires exactly one component",
          `${fact.slug}.${slot.name} is a required ${slot.content} slot`,
        );
      }
      if (
        slot.content === "element" &&
        (children.length > 1 ||
          children.some((child) => child.kind !== "component"))
      ) {
        return failure(
          `${task.path} › ${slot.label}`,
          "requires exactly one component",
          `${fact.slug}.${slot.name} is derived from ReactElement`,
        );
      }
      if (
        slot.content === "native-table" &&
        children.some((child) => child.kind !== "text" || child.text !== "")
      ) {
        return failure(
          `${task.path} › ${slot.name}`,
          "cannot accept this child because the Builder cannot author native table content",
          `${fact.slug}.${slot.name} accepts only the inert empty-text placeholder`,
        );
      }
      if (slot.content === "phrasing") {
        for (const child of children) {
          if (child.kind === "text") continue;
          const childFact = policy.bySlug.get(child.slug);
          if (childFact?.rootContent !== "phrasing") {
            return failure(
              childPath(task.path, slot, child, policy),
              `cannot be placed in ${fact.name} because that slot accepts phrasing content only`,
              `${child.slug} has root content ${
                childFact?.rootContent ?? "missing"
              }`,
            );
          }
        }
      }

      const nextInteractive = interactive === true
        ? { name: fact.name, path: task.path }
        : task.interactiveAncestor;
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child?.kind !== "component") continue;
        stack.push({
          node: child,
          path: childPath(task.path, slot, child, policy),
          interactiveAncestor: nextInteractive,
        });
      }
    }
  }
  return { ok: true };
}

/** Throw the structured refusal at every accepted-document boundary. */
export function assertBuilderStructure(
  document: BuilderDocument,
  policy: BuilderCompatibilityPolicy,
): void {
  const result = preflightBuilderStructure(document, policy);
  if (!result.ok) throw new BuilderPlacementError(result.failure);
}
