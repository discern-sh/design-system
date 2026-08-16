import { assert, assertEquals, assertThrows } from "@std/assert";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import {
  type CliExample,
  resolveCliExampleCapabilities,
} from "../../src/cli/contracts.ts";
import {
  validateCliInventory,
  validateCliStance,
} from "../../scripts/generate.ts";
import type { ComponentMeta } from "../../src/types/component-meta.ts";

const meta = {
  name: "Fixture",
  slug: "fixture",
  group: "Core",
  order: 999,
  description: "Synthetic CLI contract fixture.",
} satisfies Omit<ComponentMeta, "cli">;

Deno.test("CLI examples can pin a validated deterministic capability posture", () => {
  const base = {
    ansiControl: true,
    colorDepth: "truecolor",
    columns: 80,
    hyperlinks: true,
    mouseTracking: true,
    unicode: true,
  } as const;
  assertEquals(
    resolveCliExampleCapabilities({
      name: "plain",
      props: {},
      capabilities: {
        ansiControl: false,
        colorDepth: "none",
        columns: 24,
        hyperlinks: false,
        mouseTracking: false,
        unicode: false,
      },
    }, base),
    {
      ansiControl: false,
      colorDepth: "none",
      columns: 24,
      hyperlinks: false,
      mouseTracking: false,
      unicode: false,
    },
  );
  assertThrows(
    () =>
      resolveCliExampleCapabilities(
        {
          name: "invalid",
          props: {},
          capabilities: { columns: 0 },
        } satisfies CliExample<Record<string, never>>,
        base,
      ),
    TypeError,
    "valid terminal facts",
  );
});

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
  assertThrows(
    () => validateCliStance(meta, false, "fixture.meta.ts"),
    Error,
    "has no declared CLI stance",
  );
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
    () =>
      validateCliStance(
        { ...meta, cli: { stance: "exempt", reason: "Browser only." } },
        true,
        "fixture.meta.ts",
      ),
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

Deno.test("CLI inventory rejects a renderer without Component Metadata", () => {
  assertThrows(
    () =>
      validateCliInventory([
        new URL("file:///components/fixture/fixture.cli.ts"),
      ]),
    Error,
    "has no matching .meta.ts file",
  );
  validateCliInventory([
    new URL("file:///components/fixture/fixture.meta.ts"),
    new URL("file:///components/fixture/fixture.cli.ts"),
  ]);
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
    } else {
      assert(
        entry.reason.trim() !== "",
        `${slug} has an empty CLI exemption reason`,
      );
    }
  }
});
