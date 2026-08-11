import { assertEquals, assertThrows } from "@std/assert";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { validateCliStance } from "../../scripts/generate.ts";
import type { ComponentMeta } from "../../src/types/component-meta.ts";

const meta = {
  name: "Fixture",
  slug: "fixture",
  group: "Core",
  order: 999,
  description: "Synthetic CLI contract fixture.",
} satisfies ComponentMeta;

Deno.test("CLI stance validation guards metadata and renderer files in both directions", () => {
  validateCliStance(
    { ...meta, cli: { stance: "rendered" } },
    true,
    "fixture.meta.ts",
  );
  validateCliStance(
    { ...meta, cli: { stance: "exempt", reason: "Browser-only interaction." } },
    false,
    "fixture.meta.ts",
  );
  validateCliStance(meta, false, "fixture.meta.ts");
  assertThrows(
    () =>
      validateCliStance(
        { ...meta, cli: { stance: "rendered" } },
        false,
        "fixture.meta.ts",
      ),
    Error,
    "has no .cli.ts file",
  );
  assertThrows(
    () => validateCliStance(meta, true, "fixture.meta.ts"),
    Error,
    "no rendered CLI stance",
  );
  assertThrows(
    () =>
      validateCliStance(
        { ...meta, cli: { stance: "exempt", reason: "  " } },
        false,
        "fixture.meta.ts",
      ),
    Error,
    "without a reason",
  );
});

Deno.test("generated CLI registry enrolls all components in the current CLI tranche", () => {
  assertEquals(Object.keys(cliComponentRegistry).length, 109);
  assertEquals(cliComponentRegistry.badge, {
    stance: "rendered",
    modulePath: "../components/display/badge/badge.cli.ts",
  });
  assertEquals(
    Object.values(cliComponentRegistry).filter((entry) =>
      entry.stance === "pending"
    ).length,
    78,
  );
});
