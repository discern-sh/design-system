/**
 * Interactive browser over the generated static CLI inventory: canonical
 * Groups, every Component entry, every named example, every recorded
 * exemption, and every terminal foundation sheet — derived from the same
 * authorities as `deno task catalogue:cli`, so the two review surfaces cannot
 * drift.
 *
 * @module
 */

import {
  type CliComponentFact,
  listCliComponents,
  loadRenderedCliModule,
  renderCliComponent,
  renderCliExemptions,
} from "../cli-inventory.ts";
import {
  renderTerminalFoundationSheet,
  type TerminalFoundationSheet,
  terminalFoundationSheets,
} from "../../catalogue/terminal-foundations.ts";
import {
  type ComponentGroup,
  componentGroups,
} from "../../src/types/component-meta.ts";
import { type InteractionEntry } from "../../src/cli/interactive/mod.ts";
import type { PlaygroundRuntime } from "./types.ts";

type TopTarget =
  | ComponentGroup
  | TerminalFoundationSheet
  | "exemptions"
  | "back";
type ComponentTarget = CliComponentFact | "back";
type ExampleTarget = number | "all" | "back";
type ExampleNavigation = number | "list";

async function pauseAfterSpecimen(
  key: string,
  runtime: PlaygroundRuntime,
): Promise<void> {
  await runtime.navigator.chooseInline(key, {
    label: "Specimen review",
    hint: "The specimen remains above until you return.",
    choices: [{ id: "back", label: "Back to the catalogue", value: true }],
  });
}

/** Top-level browse menu: every canonical Group plus the foundation sheets. */
export function browseTopChoices(
  foundations: readonly TerminalFoundationSheet[] = terminalFoundationSheets,
): readonly InteractionEntry<TopTarget>[] {
  return [
    ...componentGroups.map((group) => ({
      id: `group-${group.toLocaleLowerCase()}`,
      label: group,
      value: group as TopTarget,
    })),
    ...foundations.map((sheet) => ({
      id: `foundation-${sheet.id}`,
      label: sheet.title,
      value: sheet as TopTarget,
    })),
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
    await pauseAfterSpecimen(`exemption-${fact.slug}`, runtime);
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
    const target = await runtime.navigator.choose(`examples-${fact.slug}`, {
      label: `${fact.name} examples`,
      choices,
    });
    if (target === "back" || target === undefined) return;
    if (target === "all") {
      print("");
      print(await renderCliComponent(fact.slug, fact.name, io.capabilities()));
      await pauseAfterSpecimen(`all-examples-${fact.slug}`, runtime);
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
    const target = await runtime.navigator.chooseInline(
      `example-navigation-${fact.slug}`,
      {
        label: "Example navigation",
        choices: navigation,
        initialId: next === undefined ? "back" : "next",
      },
    );
    if (target === "list" || target === undefined) return;
    index = target;
  }
}

async function browseGroup(
  group: ComponentGroup,
  runtime: PlaygroundRuntime,
): Promise<void> {
  while (true) {
    const target = await runtime.navigator.choose(`components-${group}`, {
      label: `${group} components`,
      choices: browseComponentChoices(group),
      visibleCount: 14,
    });
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
    const target = await runtime.navigator.choose("catalogue-groups", {
      label: "Static CLI catalogue",
      hint: "Enter opens; Ctrl+C returns to the hub.",
      choices: browseTopChoices(),
      visibleCount: 14,
    });
    if (target === "back" || target === undefined) return;
    if (typeof target === "object") {
      print("");
      print(renderTerminalFoundationSheet(target, io.capabilities()));
      await pauseAfterSpecimen(`foundation-${target.id}`, runtime);
      continue;
    }
    if (target === "exemptions") {
      print("");
      print(renderCliExemptions());
      await pauseAfterSpecimen("catalogue-exemptions", runtime);
      continue;
    }
    await browseGroup(target, runtime);
  }
}
