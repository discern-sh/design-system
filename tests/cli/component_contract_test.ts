import { assert, assertEquals, assertThrows } from "@std/assert";
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

Deno.test("generated CLI registry validates every enrolled stance", () => {
  assertEquals(cliComponentRegistry.badge, {
    stance: "rendered",
    modulePath: "../components/display/badge/badge.cli.ts",
  });
  for (const [slug, entry] of Object.entries(cliComponentRegistry)) {
    assert(slug !== "", "CLI registry contains an empty component slug");
    if (entry.stance === "rendered") {
      assertEquals(
        entry.modulePath.endsWith(`/${slug}.cli.ts`),
        true,
        `${slug} renderer path does not match its slug`,
      );
    } else if (entry.stance === "exempt") {
      assert(
        entry.reason.trim() !== "",
        `${slug} has an empty CLI exemption reason`,
      );
    }
  }
});
