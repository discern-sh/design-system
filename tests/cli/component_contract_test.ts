import { assert, assertEquals, assertThrows } from "@std/assert";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { componentRegistry } from "../../src/generated/component-registry.ts";
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

const cliRegistry = cliComponentRegistry as Readonly<
  Record<
    string,
    (typeof cliComponentRegistry)[keyof typeof cliComponentRegistry]
  >
>;

function assertBalancedComponentBoxPadding(
  source: string,
  label: string,
): void {
  for (const match of source.matchAll(/\bpadding\s*:\s*([^,\n}]+)/gu)) {
    const value = match[1]?.trim() ?? "";
    assert(
      /^[1-9][0-9]*$/u.test(value),
      `${label} overrides Box padding with non-positive or non-literal ${value}`,
    );
  }
}

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

Deno.test("canonical example authority and the complete CLI graph remain React-free", async () => {
  for (
    const target of [
      "../../src/types/component-examples.ts",
      "../../src/generated/cli-renderers.ts",
      "../../scripts/generated/component-examples.ts",
      "../../discern/scripts/measure-cli-pending.ts",
    ]
  ) {
    const output = await new Deno.Command(Deno.execPath(), {
      args: [
        "info",
        "--config",
        new URL("../../deno.json", import.meta.url).pathname,
        "--json",
        new URL(target, import.meta.url).pathname,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(output.success, new TextDecoder().decode(output.stderr));
    const info = JSON.parse(new TextDecoder().decode(output.stdout)) as {
      readonly modules?: readonly { readonly specifier?: string }[];
    };
    const reactModules = (info.modules ?? []).flatMap(({ specifier }) =>
      specifier !== undefined &&
        /(?:^npm:react(?:@|\/)|^npm:react-dom(?:@|\/)|\/react-dom@|\/react@)/u
          .test(specifier)
        ? [specifier]
        : []
    );
    assertEquals(reactModules, [], target);
  }
});

Deno.test("Component boxes keep positive balanced padding and Forms share the frame authority", async () => {
  const generatedRegistryUrl = new URL(
    "../../src/generated/cli-registry.ts",
    import.meta.url,
  );
  for (const { meta } of componentRegistry) {
    const entry = cliRegistry[meta.slug];
    if (entry?.stance !== "rendered") continue;
    const rendererUrl = new URL(entry.modulePath, generatedRegistryUrl);
    const source = await Deno.readTextFile(rendererUrl);
    assertBalancedComponentBoxPadding(source, meta.slug);
    if (meta.group === "Forms") {
      assert(
        source.includes("renderFormCliFrame"),
        `${meta.slug} bypasses the shared form-frame authority`,
      );
      assert(
        source.includes("showStatus"),
        `${meta.slug} does not expose the opt-in form status label`,
      );
    }
  }

  const formFrameUrl = new URL(
    "../../src/components/forms/form-frame.ts",
    import.meta.url,
  );
  assertBalancedComponentBoxPadding(
    await Deno.readTextFile(formFrameUrl),
    "form-frame",
  );

  assertThrows(
    () =>
      assertBalancedComponentBoxPadding(
        "renderBox({ body: content, padding: inset })",
        "future-sibling",
      ),
    Error,
    "future-sibling",
  );
});
