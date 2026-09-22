import { assertEquals, assertThrows } from "@std/assert";
import {
  classBlock,
  classBlockOwners,
  componentOwnedClassNames,
} from "../scripts/generate.ts";
import { componentRegistry } from "../src/generated/component-registry.ts";

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
