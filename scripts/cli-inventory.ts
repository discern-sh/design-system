/**
 * Shared authority over the terminal-surface inventory. The static CLI
 * catalogue and the interactive CLI playground both derive their Component
 * sections, exemptions, and examples from these generated facts, so a new
 * Component or example enrols in every terminal review surface at once and no
 * second hand-maintained inventory can drift. Framework-neutral foundations
 * live in the adjacent Catalogue registry shared with the browser surface.
 *
 * @module
 */

import {
  detectTerminalCapabilities,
  resolveCliExampleCapabilities,
  type TerminalCapabilities,
} from "../src/cli/mod.ts";
import type {
  CliComponentRegistryEntry,
  CliExample,
  CliRenderedRegistryEntry,
} from "../src/cli/contracts.ts";
import { cliComponentRegistry } from "../src/generated/cli-registry.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";
import type { ResolvedComponentExampleDefinition } from "../src/types/component-examples.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";
import { componentExampleRegistry } from "./generated/component-examples.ts";
import {
  terminalFoundationSheet,
  terminalFoundationSheets,
} from "../catalogue/terminal-foundations.ts";

const registry = cliComponentRegistry as Readonly<
  Record<string, CliComponentRegistryEntry>
>;
const examplesRegistry = componentExampleRegistry as Readonly<
  Record<string, readonly ResolvedComponentExampleDefinition[]>
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
  | { readonly kind: "foundation"; readonly id: string };

/** A validated, dynamically loaded rendered-component CLI module. */
export interface LoadedCliModule {
  readonly render: (
    props: unknown,
    capabilities: TerminalCapabilities,
  ) => string;
  readonly examples: readonly LoadedCliExample[];
}

/** One renderer input paired with its generated canonical human identity. */
export interface LoadedCliExample extends CliExample<unknown> {
  readonly id: string;
  readonly label: string;
}

/** Generated stance and identity facts for one component's terminal surface. */
export interface CliComponentFact {
  readonly slug: string;
  readonly name: string;
  readonly group: ComponentGroup;
  readonly entry: CliComponentRegistryEntry;
}

/** Usage line for the static CLI catalogue command. */
export function cliCatalogueUsage(): string {
  return `Usage: deno task catalogue:cli [--list|all|${
    terminalFoundationSheets.map(({ id }) => id).join("|")
  }|<group>|<component-slug>]
  (no argument)  browse one CLI specimen at a time in a real terminal
  --list         print the compact generated inventory
  all            print the exhaustive deterministic catalogue
Groups: ${componentGroups.join(", ")}`;
}

/** Resolve one optional catalogue selector against canonical generated facts. */
export function resolveCatalogueSelection(
  argument: string | undefined,
): CatalogueSelection {
  if (argument === undefined || argument === "" || argument === "all") {
    return { kind: "all" };
  }
  if (terminalFoundationSheet(argument) !== undefined) {
    return { kind: "foundation", id: argument };
  }
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
  const examples: LoadedCliExample[] = [];
  const canonicalExamples = examplesRegistry[slug]?.filter(({ surfaces }) =>
    surfaces.includes("cli")
  );
  if (canonicalExamples === undefined) {
    throw new TypeError(
      `Generated Component example registry has no ${JSON.stringify(slug)}`,
    );
  }
  for (const [index, candidate] of module.cliExamples.entries()) {
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
    const canonical = canonicalExamples[index];
    if (canonical === undefined) {
      throw new TypeError(
        `${slug} CLI module implements undeclared example ${
          JSON.stringify(example.name)
        }`,
      );
    }
    if (example.name !== canonical.id) {
      throw new TypeError(
        `${slug} CLI examples are reordered or divergent at ${index}; expected ${
          JSON.stringify(canonical.id)
        }, received ${JSON.stringify(example.name)}`,
      );
    }
    examples.push({ ...example, id: canonical.id, label: canonical.label });
  }
  if (examples.length !== canonicalExamples.length) {
    const missing = canonicalExamples.slice(examples.length).map(({ id }) =>
      id
    );
    throw new TypeError(
      `${slug} CLI module omits canonical examples ${
        missing.map((id) => JSON.stringify(id)).join(", ")
      }`,
    );
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
    const frame = module.render(
      example.props,
      resolveCliExampleCapabilities(example, capabilities),
    );
    if (typeof frame !== "string") {
      throw new TypeError(`${slug} renderer returned a non-string frame`);
    }
    return `#### ${example.label}\n\n${frame}`;
  });
  return `### ${name} (\`${slug}\`)\n\n${specimens.join("\n\n")}`;
}

/** Render every recorded CLI exemption with its identity and reason. */
export function renderCliExemptions(): string {
  const records: string[] = [];
  for (const fact of listCliComponents()) {
    if (fact.entry.stance !== "exempt") continue;
    records.push(`${fact.name} (\`${fact.slug}\`) — ${fact.entry.reason}`);
  }
  return [
    `${records.length} recorded CLI exemptions`,
    "",
    records.join("\n\n"),
  ].join("\n");
}
