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

type CatalogueSelection =
  | { readonly kind: "all" }
  | { readonly kind: "component"; readonly slug: string }
  | { readonly kind: "group"; readonly group: ComponentGroup }
  | { readonly kind: "motifs" };

interface LoadedCliModule {
  readonly render: (
    props: unknown,
    capabilities: TerminalCapabilities,
  ) => string;
  readonly examples: readonly CliExample<unknown>[];
}

const STEPPER_STATES = [
  "pending",
  "active",
  "complete",
  "error",
  "cancelled",
] as const satisfies readonly SequentialStepStatus[];

function usage(): string {
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
    `Unknown CLI catalogue selector ${JSON.stringify(argument)}.\n${usage()}`,
  );
}

function catalogueCapabilities(): TerminalCapabilities {
  const isTty = Deno.stdout.isTerminal();
  const columns = isTty ? Deno.consoleSize().columns : undefined;
  return detectTerminalCapabilities({
    env: Deno.env.toObject(),
    isTty,
    ...(columns === undefined ? {} : { columns }),
  });
}

async function loadRenderedModule(
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

async function renderComponent(
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
  if (entry.stance === "pending") {
    throw new TypeError(`${slug} has no declared CLI stance`);
  }
  if (entry.stance === "exempt") {
    return `### ${name} (\`${slug}\`) — exempt\n\n${entry.reason}`;
  }
  const module = await loadRenderedModule(slug, entry);
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

function renderTriangleMotifs(capabilities: TerminalCapabilities): string {
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

function selectedGroups(
  selection: CatalogueSelection,
): readonly ComponentGroup[] {
  if (selection.kind === "group") return [selection.group];
  if (selection.kind === "component") {
    const component = componentRegistry.find(({ meta }) =>
      meta.slug === selection.slug
    );
    if (component === undefined) {
      throw new TypeError(
        `Generated Component registry has no ${JSON.stringify(selection.slug)}`,
      );
    }
    return [component.meta.group];
  }
  return componentGroups;
}

/** Render all, one Group, one Component, or the foundation motif specimens. */
export async function renderCliCatalogue(
  argument: string | undefined,
  capabilities: TerminalCapabilities,
): Promise<string> {
  const selection = resolveCatalogueSelection(argument);
  const sections: string[] = ["# discern CLI catalogue"];
  if (selection.kind === "all" || selection.kind === "motifs") {
    sections.push(renderTriangleMotifs(capabilities));
  }
  if (selection.kind !== "motifs") {
    for (const group of selectedGroups(selection)) {
      const components = componentRegistry.filter(({ meta }) =>
        meta.group === group &&
        (selection.kind !== "component" || meta.slug === selection.slug)
      );
      const specimens = await Promise.all(
        components.map(({ meta }) =>
          renderComponent(meta.slug, meta.name, capabilities)
        ),
      );
      sections.push(`## ${group}\n\n${specimens.join("\n\n")}`);
    }
  }
  return `${sections.join("\n\n")}\n`;
}

if (import.meta.main) {
  if (Deno.args.length > 1) throw new TypeError(usage());
  const output = await renderCliCatalogue(
    Deno.args[0],
    catalogueCapabilities(),
  );
  await Deno.stdout.write(new TextEncoder().encode(output));
}
