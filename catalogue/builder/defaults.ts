/** Builder-only creation seeds layered over public and source-backed defaults. */
import type { JsonShape, PropControl } from "./controls.ts";
import type {
  BuilderNode,
  BuilderPropValue,
  BuilderSlotChild,
} from "./model.ts";

/** Id factory injected by templates so accepted documents can be deterministic. */
export type BuilderIdFactory = () => string;

function text(id: BuilderIdFactory, value: string): BuilderSlotChild {
  return { kind: "text", id: id(), text: value };
}

function slot(
  id: BuilderIdFactory,
  value: string,
): BuilderPropValue {
  return { kind: "slot", children: [text(id, value)] };
}

function node(
  id: BuilderIdFactory,
  slug: string,
  props: BuilderNode["props"],
): BuilderNode {
  return { kind: "component", id: id(), slug, props };
}

function replaceSlotIds(
  value: BuilderPropValue,
  id: BuilderIdFactory,
): BuilderPropValue {
  if (value.kind !== "slot") return value;
  return {
    kind: "slot",
    children: value.children.map((child) =>
      child.kind === "text" ? { ...child, id: id() } : {
        ...child,
        id: id(),
        props: Object.fromEntries(
          Object.entries(child.props).map(([name, member]) => [
            name,
            replaceSlotIds(member, id),
          ]),
        ),
      }
    ),
  };
}

const PLACEHOLDER_BY_PROP = Object.freeze(
  {
    title: "Page title",
    standfirst: "A short introduction to this page.",
    description: "Short supporting text.",
    children: "Content",
    label: "Label",
    fact: "Result summary",
    completion: "Completion summary.",
    action: "Next action",
    impact: "What this affects.",
    correction: "How to correct it.",
    reason: "Why this is the right next step.",
    controlId: "field-1",
  } satisfies Readonly<Record<string, string>>,
);

function placeholder(control: PropControl): string {
  return PLACEHOLDER_BY_PROP[
    control.name as keyof typeof PLACEHOLDER_BY_PROP
  ] ??
    (control.control === "slot" ? `${control.label} content` : control.label);
}

function humaniseRequiredDefaults(
  controls: readonly PropControl[],
  base: Readonly<Record<string, BuilderPropValue>>,
  id: BuilderIdFactory,
): Record<string, BuilderPropValue> {
  const props = Object.fromEntries(
    Object.entries(base).map(([name, value]) => [
      name,
      replaceSlotIds(value, id),
    ]),
  );
  for (const control of controls) {
    if (!control.required) continue;
    const value = props[control.name];
    if (
      control.control === "text" && value?.kind === "string" &&
      value.value === "Text"
    ) {
      props[control.name] = { kind: "string", value: placeholder(control) };
    } else if (
      control.control === "slot" && value?.kind === "slot" &&
      value.children.length === 1 && value.children[0]?.kind === "text" &&
      value.children[0].text === "Text"
    ) {
      props[control.name] = slot(id, placeholder(control));
    }
  }
  return props;
}

type BuilderComponentSeed = (
  props: Readonly<Record<string, BuilderPropValue>>,
  id: BuilderIdFactory,
) => Readonly<Record<string, BuilderPropValue>>;

/**
 * Deliberate complex-component seeds. Membership is validated against the live
 * registry by registry-core; every unlisted Component still receives the
 * generic required-prop layer above.
 */
const BUILDER_COMPONENT_SEEDS = Object.freeze(
  {
    button: (props, id) => ({
      ...props,
      children: slot(id, "Button label"),
    }),
    "hero-block": (props, id) => ({
      ...props,
      title: slot(id, "Page title"),
      description: slot(
        id,
        "A short supporting sentence that explains what this page offers.",
      ),
      actions: {
        kind: "slot",
        children: [node(id, "button", {
          children: slot(id, "Primary action"),
        })],
      },
    }),
    "cta-band": (props, id) => ({
      ...props,
      title: slot(id, "Ready for the next step?"),
      description: slot(
        id,
        "Explain the value of continuing in one short sentence.",
      ),
      actions: {
        kind: "slot",
        children: [node(id, "button", {
          children: slot(id, "Continue"),
        })],
      },
    }),
    tabs: (props) => ({
      ...props,
      items: {
        kind: "json",
        source: JSON.stringify([
          { value: "tab-1", label: "Tab 1", content: "Content for Tab 1." },
          { value: "tab-2", label: "Tab 2", content: "Content for Tab 2." },
        ]),
      },
    }),
    "feature-bento": (props, id) => ({
      ...props,
      title: slot(id, "Key features"),
      items: {
        kind: "json",
        source: JSON.stringify([
          {
            title: "First feature",
            description:
              "A concise explanation of the first useful capability.",
            size: "wide",
          },
          {
            title: "Second feature",
            description: "A concise explanation of another useful capability.",
          },
          {
            title: "Third feature",
            description:
              "A concise explanation of the final useful capability.",
          },
        ]),
      },
    }),
    "faq-block": (props, id) => ({
      ...props,
      title: slot(id, "Frequently asked questions"),
      items: {
        kind: "json",
        source: JSON.stringify([
          {
            question: "What should someone know first?",
            answer: "Give a short, direct answer in plain language.",
          },
          {
            question: "Where can someone learn more?",
            answer: "Point to the next useful source of detail.",
          },
        ]),
      },
    }),
    "article-header": (props, id) => ({
      ...props,
      title: slot(id, "Article title"),
      standfirst: slot(id, "A short summary that introduces the article."),
    }),
    "result-summary": (props, id) => ({
      ...props,
      fact: slot(id, "The operation completed successfully."),
      counts: {
        kind: "json",
        source: JSON.stringify([
          { label: "Changed", value: "1" },
          { label: "Unchanged", value: "0" },
        ]),
      },
      nextAction: slot(id, "Review the result and continue when ready."),
    }),
    procedure: (props, id) => ({
      ...props,
      title: slot(id, "Complete this workflow"),
      steps: {
        kind: "json",
        source: JSON.stringify([{
          title: "First step",
          action: "Complete the first required action.",
          completionCriterion: "The expected result is visible.",
        }]),
      },
      completion: slot(id, "The workflow is complete."),
    }),
  } satisfies Readonly<Record<string, BuilderComponentSeed>>,
);

/** Component slugs with a deliberate complex Builder seed. */
export const builderSeededSlugs: readonly string[] = Object.freeze(
  Object.keys(BUILDER_COMPONENT_SEEDS),
);

/** Fail when a curated seed no longer names a live Component. */
export function assertBuilderSeedSlugs(
  liveSlugs: ReadonlySet<string>,
): void {
  for (const slug of builderSeededSlugs) {
    if (!liveSlugs.has(slug)) {
      throw new TypeError(
        `Builder creation seed names unknown Component ${JSON.stringify(slug)}`,
      );
    }
  }
}

/**
 * Apply generic human required values, then the deliberate complex seed.
 * The `base` already contains public synthesis and catalogueBuilderDefaults.
 */
export function applyBuilderCreationDefaults(
  slug: string,
  controls: readonly PropControl[],
  base: Readonly<Record<string, BuilderPropValue>>,
  id: BuilderIdFactory,
): Record<string, BuilderPropValue> {
  const human = humaniseRequiredDefaults(controls, base, id);
  const seed = BUILDER_COMPONENT_SEEDS[
    slug as keyof typeof BUILDER_COMPONENT_SEEDS
  ];
  return seed === undefined ? human : { ...seed(human, id) };
}

/** A source-backed seed for one newly added structured Inspector row. */
export interface BuilderStructuredRowSeed {
  readonly row: Readonly<Record<string, unknown>>;
  readonly focusMember: string | undefined;
}

function rowStem(shape: JsonShape): string {
  return shape.typeName
    .replace(/Item$/u, "")
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .trim() || "Item";
}

function uniqueRowValue(
  stem: string,
  rows: readonly Readonly<Record<string, unknown>>[],
  member: string,
): string {
  const base = stem.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
  const values = new Set(rows.map((row) => row[member]));
  let index = rows.length + 1;
  while (values.has(`${base}-${String(index)}`)) index += 1;
  return `${base}-${String(index)}`;
}

/**
 * Create one valid, unique, human row without knowing the consuming Component.
 * Builder 2D consumes `focusMember` when it owns the shaped-row interaction.
 */
export function newBuilderStructuredRow(
  shape: JsonShape,
  rows: readonly Readonly<Record<string, unknown>>[],
): BuilderStructuredRowSeed {
  const stem = rowStem(shape);
  const ordinal = rows.length + 1;
  const row: Record<string, unknown> = {};
  let focusMember: string | undefined;
  for (const member of shape.members) {
    if (!member.required) continue;
    focusMember ??= member.name;
    switch (member.control) {
      case "text":
        if (/^(?:id|key|value)$/iu.test(member.name)) {
          row[member.name] = uniqueRowValue(stem, rows, member.name);
        } else if (/^(?:label|name|title|question)$/iu.test(member.name)) {
          row[member.name] = `${stem} ${String(ordinal)}`;
        } else if (
          /^(?:content|description|answer|summary)$/iu.test(
            member.name,
          )
        ) {
          row[member.name] = `Content for ${stem} ${String(ordinal)}.`;
        } else {
          row[member.name] = member.label;
        }
        break;
      case "number":
        row[member.name] = 0;
        break;
      case "toggle":
        row[member.name] = false;
        break;
      case "select":
        if (member.options[0] !== undefined) {
          row[member.name] = member.options[0];
        }
        break;
      case "json":
        row[member.name] = member.typeText.includes("[]") ? [] : {};
        break;
      case "slot":
        break;
    }
  }
  return { row: Object.freeze(row), focusMember };
}
