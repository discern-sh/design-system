import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  classBlock,
  classBlockOwners,
  componentOwnedClassNames,
  loadComponentSources,
} from "../scripts/generate.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";

const CLASS_LITERAL =
  /(?<![\w-])discern-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?/g;

Deno.test("every class a Component stylesheet targets has exactly one owner", () => {
  const owners = new Map<string, string[]>();
  for (const { meta, ownedClasses } of componentRegistry) {
    for (const name of ownedClasses) {
      owners.set(name, [...(owners.get(name) ?? []), meta.slug]);
    }
  }
  assertEquals(
    [...owners].filter(([, slugs]) => slugs.length > 1),
    [],
    "a class is claimed by more than one Component",
  );
});

Deno.test("class blocks resolve to one owner and refuse an unowned stylesheet class", () => {
  const owners = classBlockOwners([
    { slug: "alpha", classBlocks: ["shared"] },
    { slug: "beta" },
  ] as never);
  assertEquals(classBlock("discern-shared__part--state"), "shared");
  assertEquals(
    componentOwnedClassNames(
      ".discern-shared__part {} .discern-beta--quiet .discern-alpha {}",
      "alpha",
      owners,
    ),
    ["discern-alpha", "discern-shared__part"],
  );
  assertThrows(
    () => componentOwnedClassNames(".discern-orphan {}", "beta", owners),
    Error,
    "no Component owns",
  );
  assertThrows(
    () =>
      classBlockOwners(
        [{ slug: "alpha" }, { slug: "beta", classBlocks: ["alpha"] }] as never,
      ),
    Error,
    "already owns",
  );
});

Deno.test("a Component that renders another Component's class depends on its owner", async () => {
  const sources = await loadComponentSources();
  const owners = classBlockOwners(sources.map(({ meta }) => meta));
  const styled = new Set<string>(
    componentRegistry.flatMap((entry) => entry.ownedClasses),
  );
  const dependencies = new Map(
    componentRegistry.map((
      { meta, dependencies },
    ) => [meta.slug, dependencies]),
  );
  const closure = (slug: string, reached = new Set<string>()): Set<string> => {
    for (const dependency of dependencies.get(slug) ?? []) {
      if (reached.has(dependency)) continue;
      reached.add(dependency);
      closure(dependency, reached);
    }
    return reached;
  };
  const violations: string[] = [];
  for (const { meta, implementationUrl } of sources) {
    const reachable = closure(meta.slug);
    const source = await Deno.readTextFile(implementationUrl);
    for (const [name] of source.matchAll(CLASS_LITERAL)) {
      const className = name as `discern-${string}`;
      if (!styled.has(className)) continue;
      const owner = owners.get(classBlock(className));
      assert(owner !== undefined, `${className} has no owner`);
      if (owner !== meta.slug && !reachable.has(owner)) {
        violations.push(`${meta.slug} renders ${className} from ${owner}`);
      }
    }
  }
  assertEquals(
    [...new Set(violations)],
    [],
    "a selection would emit markup without its owner's stylesheet",
  );
});
