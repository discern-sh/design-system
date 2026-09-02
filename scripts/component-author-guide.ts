/**
 * Project Component Metadata into the generated Markdown author guide.
 *
 * Every fact in the guide comes from a Component's `*.meta.ts` file and the
 * example vocabulary beside it, so the guide an agent reads is the same
 * authority the registries, adapters, and Catalogue derive from. The
 * renderer is pure: `scripts/generate.ts` supplies the canonical inventory
 * and writes the result.
 */

import type { ResolvedComponentExampleDefinition } from "../src/types/component-examples.ts";
import {
  type CataloguePurpose,
  cataloguePurposeDetails,
  cataloguePurposes,
  componentGroups,
  type ComponentMeta,
} from "../src/types/component-meta.ts";
import { pascalIdentifier } from "./kind-family.ts";

/** One Component's Metadata and its resolved canonical examples. */
export interface ComponentAuthorGuideSource {
  readonly meta: ComponentMeta;
  readonly examples: readonly ResolvedComponentExampleDefinition[];
}

/** The generated guide's document title. */
export const COMPONENT_AUTHOR_GUIDE_TITLE = "# Built-in Components";

/** The heading that opens one Component's section of the guide. */
export function componentAuthorGuideHeading(
  meta: Pick<ComponentMeta, "name" | "slug">,
): string {
  return `### ${meta.name} (\`${meta.slug}\`)`;
}

/** The React adapter export the generated `./react` barrel publishes. */
export function componentReactExportName(slug: string): string {
  return pascalIdentifier(slug);
}

/** The terminal renderer export the generated `./cli` barrel publishes. */
export function componentCliRendererName(slug: string): string {
  return `render${pascalIdentifier(slug)}Cli`;
}

const PREAMBLE = [
  "Each section states one Component's identity, purpose collections, when to use it, when another route serves better, its terminal stance, its accessibility contract, and its canonical examples. Choose by the reader's task, then author through the public contract:",
  "",
  "- Runtime: select the slug from a section heading with `emitDesignSystemRuntime` from `@discern-sh/design-system/runtime`. Generated dependency resolution adds prerequisites, and the emitted `discern.css` applies only inside `data-discern-root`.",
  "- React: import the named adapter from `@discern-sh/design-system/react` and render it at build time.",
  "- Terminal: import the named renderer from `@discern-sh/design-system/cli`; it is pure and takes explicit terminal capabilities.",
  "- Semantic HTML: use the `discern-<slug>` class family the package owns. Consumer styles never target owned classes, copy Component CSS, or fork a Component for appearance.",
] as const;

function nameWithSlug(meta: Pick<ComponentMeta, "name" | "slug">): string {
  return `${meta.name} (\`${meta.slug}\`)`;
}

function purposeLine(
  purpose: CataloguePurpose,
  members: readonly ComponentMeta[],
): string {
  const detail = cataloguePurposeDetails[purpose];
  const list = members.length === 0
    ? "none"
    : members.map(nameWithSlug).join(", ");
  return `- **${detail.label}** (\`${purpose}\`): ${detail.description} Components: ${list}.`;
}

function guidanceLines(
  label: string,
  items: readonly string[] | undefined,
  absence: string,
): readonly string[] {
  if (items === undefined || items.length === 0) {
    return [`${label}: ${absence}`, ""];
  }
  return [`${label}:`, ...items.map((item) => `- ${item}`), ""];
}

function exampleLabel(example: ResolvedComponentExampleDefinition): string {
  const restriction = example.surfaces.length === 1
    ? `, ${example.surfaces[0]} only`
    : "";
  return `${example.label} (\`${example.id}\`${restriction})`;
}

function componentSection(source: ComponentAuthorGuideSource): string[] {
  const { meta, examples } = source;
  const purposes = meta.purposes === undefined || meta.purposes.length === 0
    ? "none"
    : meta.purposes.join(", ");
  const terminal = meta.cli.stance === "rendered"
    ? `\`${componentCliRendererName(meta.slug)}\`.`
    : `exempt — ${meta.cli.reason}`;
  const behaviors = meta.behaviors === undefined || meta.behaviors.length === 0
    ? []
    : [
      `Browser behavior: ${
        meta.behaviors.map((behavior) => `\`${behavior}\``).join(", ")
      } (load the emitted \`discern.js\` beside \`discern.css\`).`,
    ];
  return [
    componentAuthorGuideHeading(meta),
    "",
    meta.description,
    "",
    `Group: ${meta.group}. Purposes: ${purposes}.`,
    `React: \`${componentReactExportName(meta.slug)}\`. Terminal: ${terminal}`,
    ...behaviors,
    "",
    ...guidanceLines(
      "Use when",
      meta.useWhen,
      "Metadata states no situation narrower than the description.",
    ),
    ...guidanceLines(
      "Do not use when",
      meta.notWhen,
      "Metadata records no refusal; weigh the sibling Components in this Group.",
    ),
    ...guidanceLines(
      "Accessibility",
      meta.accessibility,
      "Metadata records no Component-specific note; the package invariants still apply.",
    ),
    `Examples: ${examples.map(exampleLabel).join(", ")}.`,
    "",
  ];
}

/**
 * Render the complete guide: title, preamble, the purpose collections with
 * their members, then one section per Component beneath its Group heading.
 *
 * Groups follow the canonical Group order and each Group keeps the order it
 * was given, so the caller's canonical inventory order survives verbatim.
 */
export function renderComponentAuthorGuide(
  components: readonly ComponentAuthorGuideSource[],
): string {
  if (components.length === 0) {
    throw new Error("The Component author guide needs at least one Component");
  }
  const seen = new Set<string>();
  for (const { meta } of components) {
    if (seen.has(meta.slug)) {
      throw new Error(
        `Duplicate Component slug in the author guide: ${meta.slug}`,
      );
    }
    seen.add(meta.slug);
  }
  const grouped = componentGroups
    .map((group) => ({
      group,
      members: components.filter(({ meta }) => meta.group === group),
    }))
    .filter(({ members }) => members.length > 0);
  const canonical = grouped.flatMap(({ members }) => members);
  const lines = [
    COMPONENT_AUTHOR_GUIDE_TITLE,
    "",
    ...PREAMBLE,
    "",
    "## Purposes",
    "",
    ...cataloguePurposes.map((purpose) =>
      purposeLine(
        purpose,
        canonical
          .map(({ meta }) => meta)
          .filter((meta) => meta.purposes?.includes(purpose)),
      )
    ),
    "",
    ...grouped.flatMap(({ group, members }) => [
      `## ${group}`,
      "",
      ...members.flatMap(componentSection),
    ]),
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}
