/**
 * Interactive browser over the generated static CLI inventory: canonical
 * Groups, every Component entry, every named example, every recorded
 * exemption, and the triangle motif sheet — derived from the same authority
 * as `deno task catalogue:cli`, so nothing here can drift from Codegen.
 *
 * @module
 */

import {
  type CliComponentFact,
  listCliComponents,
  loadRenderedCliModule,
  renderCliComponent,
  renderCliExemptions,
  renderTriangleMotifSheet,
} from "../cli-inventory.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../../src/types/component-meta.ts";
import {
  type InteractionEntry,
  requestSelection,
} from "../../src/cli/interactive/mod.ts";
import type { PlaygroundRuntime } from "./types.ts";

type TopTarget = ComponentGroup | "motifs" | "exemptions" | "back";
type ComponentTarget = CliComponentFact | "back";
type ExampleTarget = number | "all" | "back";
type ExampleNavigation = number | "list";

/** Top-level browse menu: every canonical Group plus the two sheets. */
export function browseTopChoices(): readonly InteractionEntry<TopTarget>[] {
  return [
    ...componentGroups.map((group) => ({
      id: `group-${group.toLocaleLowerCase()}`,
      label: group,
      value: group as TopTarget,
    })),
    { id: "motifs", label: "Triangle motif sheet", value: "motifs" },
    { id: "exemptions", label: "Recorded exemptions", value: "exemptions" },
    { id: "back", label: "Back to the hub", value: "back" },
  ];
}

/** Component menu for one Group, marking exempt entries inline. */
export function browseComponentChoices(
  group: ComponentGroup,
): readonly InteractionEntry<ComponentTarget>[] {
  return [
    ...listCliComponents(group).map((fact) => ({
      id: `component-${fact.slug}`,
      label: fact.entry.stance === "exempt"
        ? `${fact.name} (exempt)`
        : fact.name,
      value: fact as ComponentTarget,
    })),
    { id: "back", label: "Back to Groups", value: "back" },
  ];
}

async function browseComponent(
  fact: CliComponentFact,
  runtime: PlaygroundRuntime,
): Promise<void> {
  const { io, print } = runtime;
  if (fact.entry.stance === "exempt") {
    print("");
    print(await renderCliComponent(fact.slug, fact.name, io.capabilities()));
    return;
  }
  const module = await loadRenderedCliModule(fact.slug, fact.entry);
  while (true) {
    const choices: InteractionEntry<ExampleTarget>[] = [
      ...module.examples.map((example, index) => ({
        id: `example-${example.name}`,
        label: example.name,
        value: index as ExampleTarget,
      })),
      { id: "all", label: "All examples", value: "all" },
      { id: "back", label: "Back to components", value: "back" },
    ];
    const target = await requestSelection({
      label: `${fact.name} examples`,
      choices,
    }, { io });
    if (target === "back" || target === undefined) return;
    if (target === "all") {
      print("");
      print(await renderCliComponent(fact.slug, fact.name, io.capabilities()));
      continue;
    }
    await browseExample(fact, module, target, runtime);
  }
}

async function browseExample(
  fact: CliComponentFact,
  module: Awaited<ReturnType<typeof loadRenderedCliModule>>,
  initialIndex: number,
  runtime: PlaygroundRuntime,
): Promise<void> {
  const { io, print } = runtime;
  let index = initialIndex;
  while (true) {
    const example = module.examples[index];
    if (example === undefined) return;
    print("");
    print(
      `${fact.name} · ${example.name} (${
        index + 1
      } of ${module.examples.length})`,
    );
    print("");
    print(module.render(example.props, io.capabilities()));
    const navigation: InteractionEntry<ExampleNavigation>[] = [];
    const next = module.examples[index + 1];
    if (next !== undefined) {
      navigation.push({
        id: "next",
        label: `Next example (${next.name})`,
        value: index + 1,
      });
    }
    const previous = index > 0 ? module.examples[index - 1] : undefined;
    if (previous !== undefined) {
      navigation.push({
        id: "previous",
        label: `Previous example (${previous.name})`,
        value: index - 1,
      });
    }
    navigation.push({ id: "back", label: "Back to examples", value: "list" });
    const target = await requestSelection({
      label: "Example navigation",
      choices: navigation,
    }, { io });
    if (target === "list" || target === undefined) return;
    index = target;
  }
}

async function browseGroup(
  group: ComponentGroup,
  runtime: PlaygroundRuntime,
): Promise<void> {
  const { io } = runtime;
  while (true) {
    const target = await requestSelection({
      label: `${group} components`,
      choices: browseComponentChoices(group),
    }, { io });
    if (target === "back" || target === undefined) return;
    await browseComponent(target, runtime);
  }
}

/**
 * Browse Groups, Components, and examples until the maintainer backs out.
 * Ctrl+C anywhere returns straight to the hub through the journey wrapper.
 */
export async function runBrowseJourney(
  runtime: PlaygroundRuntime,
): Promise<void> {
  const { io, print } = runtime;
  while (true) {
    const target = await requestSelection({
      label: "Static CLI catalogue",
      hint: "Enter opens; Ctrl+C returns to the hub.",
      choices: browseTopChoices(),
    }, { io });
    if (target === "back" || target === undefined) return;
    if (target === "motifs") {
      print("");
      print(renderTriangleMotifSheet(io.capabilities()));
      continue;
    }
    if (target === "exemptions") {
      print("");
      print(renderCliExemptions());
      continue;
    }
    await browseGroup(target, runtime);
  }
}
