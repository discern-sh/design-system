import type { TerminalCapabilities } from "../src/cli/mod.ts";
import {
  type CatalogueSelection,
  cliCatalogueUsage,
  detectProcessTerminalCapabilities,
  listCliComponents,
  renderCliComponent,
  renderNarrationLineSheet,
  renderTriangleMotifSheet,
  resolveCatalogueSelection,
} from "./cli-inventory.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../src/types/component-meta.ts";

export { resolveCatalogueSelection };

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
  if (selection.kind === "all" || selection.kind === "motifs") {
    sections.push(renderTriangleMotifSheet(capabilities));
  }
  if (selection.kind === "all" || selection.kind === "narration") {
    sections.push(renderNarrationLineSheet(capabilities));
  }
  if (selection.kind !== "motifs" && selection.kind !== "narration") {
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
  if (Deno.args.length > 1) throw new TypeError(cliCatalogueUsage());
  const output = await renderCliCatalogue(
    Deno.args[0],
    detectProcessTerminalCapabilities(),
  );
  await Deno.stdout.write(new TextEncoder().encode(output));
}
