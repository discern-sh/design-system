import type { TerminalCapabilities } from "../src/cli/mod.ts";
import { DenoTerminalIO } from "../src/cli/interactive/mod.ts";
import {
  type CatalogueSelection,
  cliCatalogueUsage,
  detectProcessTerminalCapabilities,
  listCliComponents,
  renderCliComponent,
  resolveCatalogueSelection,
} from "./cli-inventory.ts";
import {
  renderTerminalFoundationSheet,
  terminalFoundationSheet,
  terminalFoundationSheets,
} from "../catalogue/terminal-foundations.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";
import {
  renderCliCatalogueIndex,
  runCliCatalogueBrowser,
} from "./catalogue-browser.ts";

export { resolveCatalogueSelection };

/** Human browser, finite index, or deterministic stdout rendering. */
export type CliCatalogueCommand =
  | { readonly kind: "browse" }
  | { readonly kind: "list" }
  | { readonly kind: "render"; readonly selector: string };

/** Resolve command syntax without reading process or terminal state. */
export function resolveCliCatalogueCommand(
  args: readonly string[],
  screenCapable: boolean,
): CliCatalogueCommand {
  if (args.length > 1) throw new TypeError(cliCatalogueUsage());
  const argument = args[0];
  if (argument === undefined || argument === "") {
    return screenCapable ? { kind: "browse" } : { kind: "list" };
  }
  if (
    argument === "--list" || argument === "list" || argument === "--help" ||
    argument === "help"
  ) {
    return { kind: "list" };
  }
  return { kind: "render", selector: argument === "--all" ? "all" : argument };
}

function selectedGroups(
  selection: CatalogueSelection,
): readonly ComponentGroup[] {
  if (selection.kind === "group") return [selection.group];
  if (selection.kind === "component") {
    const component = listCliComponents().find(({ slug }) =>
      slug === selection.slug
    );
    if (component === undefined) {
      throw new TypeError(
        `Generated Component registry has no ${JSON.stringify(selection.slug)}`,
      );
    }
    return [component.group];
  }
  return componentGroups;
}

/** Render all, one Group, one Component, or one foundation specimen sheet. */
export async function renderCliCatalogue(
  argument: string | undefined,
  capabilities: TerminalCapabilities,
): Promise<string> {
  const selection = resolveCatalogueSelection(argument);
  const sections: string[] = ["# discern CLI catalogue"];
  if (selection.kind === "all") {
    sections.push(
      ...terminalFoundationSheets.map((sheet) =>
        renderTerminalFoundationSheet(sheet, capabilities)
      ),
    );
  }
  if (selection.kind === "foundation") {
    const sheet = terminalFoundationSheet(selection.id);
    if (sheet === undefined) {
      throw new TypeError(
        `Terminal foundation registry has no ${JSON.stringify(selection.id)}`,
      );
    }
    sections.push(renderTerminalFoundationSheet(sheet, capabilities));
  } else {
    for (const group of selectedGroups(selection)) {
      const components = listCliComponents(group).filter(({ slug }) =>
        selection.kind !== "component" || slug === selection.slug
      );
      const specimens = await Promise.all(
        components.map(({ slug, name }) =>
          renderCliComponent(slug, name, capabilities)
        ),
      );
      sections.push(`## ${group}\n\n${specimens.join("\n\n")}`);
    }
  }
  return `${sections.join("\n\n")}\n`;
}

if (import.meta.main) {
  const io = new DenoTerminalIO();
  const command = resolveCliCatalogueCommand(
    Deno.args,
    io.isInteractive() && io.capabilities().ansiControl !== false,
  );
  if (command.kind === "browse") {
    await runCliCatalogueBrowser(io);
  } else {
    const output = command.kind === "list"
      ? renderCliCatalogueIndex()
      : await renderCliCatalogue(
        command.selector,
        detectProcessTerminalCapabilities(),
      );
    await Deno.stdout.write(new TextEncoder().encode(output));
  }
}
