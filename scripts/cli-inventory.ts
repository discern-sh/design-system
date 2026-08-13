/**
 * Shared authority over the terminal-surface inventory. The static CLI
 * catalogue and the interactive CLI playground both derive their component
 * sections, exemptions, examples, and triangle motifs from these generated
 * facts, so a new Component or example enrols in every terminal review
 * surface at once and no second hand-maintained inventory can drift.
 *
 * @module
 */

import {
  detectTerminalCapabilities,
  DISCERN_TRIANGLE_SPINNER_ORDER,
  DISCERN_TRIANGLE_WEAVE_ORDER,
  renderTriangleActivityBeacon,
  renderTrianglePattern,
  renderTriangleProgressFrame,
  renderTriangleSectionRule,
  renderTriangleSpinnerFrame,
  renderTriangleWorkflowStepper,
  type SequentialStepStatus,
  type TerminalCapabilities,
} from "../src/cli/mod.ts";
import type {
  CliComponentRegistryEntry,
  CliExample,
  CliRenderedRegistryEntry,
} from "../src/cli/contracts.ts";
import { cliComponentRegistry } from "../src/generated/cli-registry.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";

const registry = cliComponentRegistry as Readonly<
  Record<string, CliComponentRegistryEntry>
>;
const registryModule = new URL(
  "../src/generated/cli-registry.ts",
  import.meta.url,
);

/** One selector resolved against the canonical generated catalogue facts. */
export type CatalogueSelection =
  | { readonly kind: "all" }
  | { readonly kind: "component"; readonly slug: string }
  | { readonly kind: "group"; readonly group: ComponentGroup }
  | { readonly kind: "motifs" };

/** A validated, dynamically loaded rendered-component CLI module. */
export interface LoadedCliModule {
  readonly render: (
    props: unknown,
    capabilities: TerminalCapabilities,
  ) => string;
  readonly examples: readonly CliExample<unknown>[];
}

/** Generated stance and identity facts for one component's terminal surface. */
export interface CliComponentFact {
  readonly slug: string;
  readonly name: string;
  readonly group: ComponentGroup;
  readonly entry: CliComponentRegistryEntry;
}

const STEPPER_STATES = [
  "pending",
  "active",
  "complete",
  "error",
  "cancelled",
] as const satisfies readonly SequentialStepStatus[];

/** Usage line for the static CLI catalogue command. */
export function cliCatalogueUsage(): string {
  return `Usage: deno task catalogue:cli [all|triangles|<group>|<component-slug>]
Groups: ${componentGroups.join(", ")}`;
}

/** Resolve one optional catalogue selector against canonical generated facts. */
export function resolveCatalogueSelection(
  argument: string | undefined,
): CatalogueSelection {
  if (argument === undefined || argument === "" || argument === "all") {
    return { kind: "all" };
  }
  if (argument === "triangles") return { kind: "motifs" };
  if (registry[argument] !== undefined) {
    return { kind: "component", slug: argument };
  }
  const group = componentGroups.find((candidate) =>
    candidate.toLocaleLowerCase() === argument.toLocaleLowerCase()
  );
  if (group !== undefined) return { kind: "group", group };
  throw new TypeError(
    `Unknown CLI catalogue selector ${
      JSON.stringify(argument)
    }.\n${cliCatalogueUsage()}`,
  );
}

/** List generated component stance facts, optionally within one Group. */
export function listCliComponents(
  group?: ComponentGroup,
): readonly CliComponentFact[] {
  return componentRegistry
    .filter(({ meta }) => group === undefined || meta.group === group)
    .map(({ meta }) => {
      const entry = registry[meta.slug];
      if (entry === undefined) {
        throw new TypeError(
          `Generated CLI registry has no ${JSON.stringify(meta.slug)}`,
        );
      }
      return { slug: meta.slug, name: meta.name, group: meta.group, entry };
    });
}

/** Detect capabilities from the real process environment and viewport. */
export function detectProcessTerminalCapabilities(): TerminalCapabilities {
  const isTty = Deno.stdout.isTerminal();
  const columns = isTty ? Deno.consoleSize().columns : undefined;
  return detectTerminalCapabilities({
    env: Deno.env.toObject(),
    isTty,
    ...(columns === undefined ? {} : { columns }),
  });
}

/** Load and validate one rendered component's CLI module and examples. */
export async function loadRenderedCliModule(
  slug: string,
  entry: CliRenderedRegistryEntry,
): Promise<LoadedCliModule> {
  const loaded = await import(
    new URL(entry.modulePath, registryModule).href
  ) as unknown;
  if (typeof loaded !== "object" || loaded === null) {
    throw new TypeError(`${slug} CLI module has no exports`);
  }
  const module = loaded as Readonly<Record<string, unknown>>;
  if (typeof module.default !== "function") {
    throw new TypeError(`${slug} CLI module has no default renderer`);
  }
  if (!Array.isArray(module.cliExamples) || module.cliExamples.length === 0) {
    throw new TypeError(`${slug} CLI module has no cliExamples`);
  }
  const names = new Set<string>();
  const examples: CliExample<unknown>[] = [];
  for (const candidate of module.cliExamples) {
    if (typeof candidate !== "object" || candidate === null) {
      throw new TypeError(`${slug} has an invalid CLI example`);
    }
    const example = candidate as CliExample<unknown>;
    if (typeof example.name !== "string" || example.name.trim() === "") {
      throw new TypeError(`${slug} has an unnamed CLI example`);
    }
    if (names.has(example.name)) {
      throw new TypeError(
        `${slug} repeats CLI example ${JSON.stringify(example.name)}`,
      );
    }
    names.add(example.name);
    examples.push(example);
  }
  return {
    render: module.default as LoadedCliModule["render"],
    examples,
  };
}

/** Render one component's complete catalogue section or exemption record. */
export async function renderCliComponent(
  slug: string,
  name: string,
  capabilities: TerminalCapabilities,
): Promise<string> {
  const entry = registry[slug];
  if (entry === undefined) {
    throw new TypeError(
      `Generated CLI registry has no ${JSON.stringify(slug)}`,
    );
  }
  if (entry.stance === "exempt") {
    return `### ${name} (\`${slug}\`) — exempt\n\n${entry.reason}`;
  }
  const module = await loadRenderedCliModule(slug, entry);
  const specimens = module.examples.map((example) => {
    const frame = module.render(example.props, capabilities);
    if (typeof frame !== "string") {
      throw new TypeError(`${slug} renderer returned a non-string frame`);
    }
    return `#### ${example.name}\n\n${frame}`;
  });
  return `### ${name} (\`${slug}\`)\n\n${specimens.join("\n\n")}`;
}

function motifWidth(capabilities: TerminalCapabilities): number {
  return Math.min(32, capabilities.columns);
}

/** Render the complete triangle motif sheet through public package APIs. */
export function renderTriangleMotifSheet(
  capabilities: TerminalCapabilities,
): string {
  const width = motifWidth(capabilities);
  if (width < 8) {
    throw new TypeError(
      `terminal width ${capabilities.columns} cannot hold the triangle catalogue`,
    );
  }
  const patternLength = Math.min(24, width);
  const spinnerPhases = DISCERN_TRIANGLE_SPINNER_ORDER.map((name, phase) =>
    `phase ${phase} · ${name}\n${
      renderTriangleSpinnerFrame(phase, capabilities)
    }`
  ).join("\n");
  const progress = [0, 25, 100].map((completed) =>
    `${completed} percent\n${
      renderTriangleProgressFrame({
        completed,
        total: 100,
        width,
      }, capabilities)
    }`
  ).join("\n");
  const stepper = renderTriangleWorkflowStepper(
    STEPPER_STATES.map((status, phase) => ({
      label: status,
      status,
      ...(status === "active" ? { phase } : {}),
    })),
    capabilities,
  );
  const beaconWidth = Math.min(16, width);
  const beaconExtent = beaconWidth - DISCERN_TRIANGLE_WEAVE_ORDER.length;
  const beaconPhases = [
    0,
    Math.floor(beaconExtent / 2),
    beaconExtent,
    beaconExtent + Math.floor(beaconExtent / 2),
  ];
  const beacons = beaconPhases.map((phase) =>
    `phase ${phase}\n${
      renderTriangleActivityBeacon({
        width: beaconWidth,
        phase,
      }, capabilities)
    }`
  ).join("\n");
  const specimens = [
    [
      "Horizontal divider",
      renderTrianglePattern({ length: patternLength }, capabilities),
    ],
    [
      "Vertical divider",
      renderTrianglePattern({
        length: 5,
        orientation: "vertical",
      }, capabilities),
    ],
    [
      "Thick ribbon",
      renderTrianglePattern({
        length: patternLength,
        thickness: 2,
      }, capabilities),
    ],
    [
      "Field / weave",
      renderTrianglePattern({
        length: patternLength,
        thickness: 4,
      }, capabilities),
    ],
    ["Spinner phases", spinnerPhases],
    ["Determinate progress", progress],
    [
      "Labeled section rule",
      renderTriangleSectionRule("Rule", { width }, capabilities),
    ],
    ["Stepper states", stepper],
    ["Activity-beacon phases", beacons],
  ] as const;
  return `## Triangle motifs\n\n${
    specimens.map(([name, frame]) => `### ${name}\n\n${frame}`).join("\n\n")
  }`;
}
