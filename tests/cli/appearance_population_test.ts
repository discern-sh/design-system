import { assert, assertEquals, assertThrows } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
  resolveCliExampleCapabilities,
} from "../../src/cli/contracts.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  resolveTerminalTheme,
  type TerminalTheme,
  terminalThemes,
} from "../../src/cli/theme.ts";
import {
  accentAppearance,
  type Appearance,
  fieldAppearance,
} from "../../src/tokens/tokens.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import {
  listCliComponents,
  loadRenderedCliModule,
} from "../../scripts/cli-inventory.ts";
import { pascalIdentifier } from "../../scripts/kind-family.ts";

interface SgrColors {
  readonly rgb: readonly string[];
  readonly ansi256: readonly number[];
  readonly ansi16: readonly number[];
}

const SGR_SEQUENCE = new RegExp(
  `${String.fromCharCode(27)}\\[([0-9;]*)m`,
  "gu",
);

function rgbKey(
  color: Readonly<{ red: number; green: number; blue: number }>,
): string {
  return `${color.red};${color.green};${color.blue}`;
}

function ansi16Index(code: number): number | undefined {
  if (code >= 30 && code <= 37) return code - 30;
  if (code >= 40 && code <= 47) return code - 40;
  if (code >= 90 && code <= 97) return code - 90 + 8;
  if (code >= 100 && code <= 107) return code - 100 + 8;
  return undefined;
}

function sgrColors(frame: string): SgrColors {
  const rgb: string[] = [];
  const ansi256: number[] = [];
  const ansi16: number[] = [];
  for (const match of frame.matchAll(SGR_SEQUENCE)) {
    const codes = (match[1] ?? "").split(";").filter((part) => part !== "")
      .map(Number);
    for (let index = 0; index < codes.length; index += 1) {
      const code = codes[index];
      if ((code === 38 || code === 48) && codes[index + 1] === 2) {
        const red = codes[index + 2];
        const green = codes[index + 3];
        const blue = codes[index + 4];
        if (red !== undefined && green !== undefined && blue !== undefined) {
          rgb.push(`${red};${green};${blue}`);
        }
        index += 4;
        continue;
      }
      if ((code === 38 || code === 48) && codes[index + 1] === 5) {
        const paletteIndex = codes[index + 2];
        if (paletteIndex !== undefined) ansi256.push(paletteIndex);
        index += 2;
        continue;
      }
      if (code === undefined) continue;
      const paletteIndex = ansi16Index(code);
      if (paletteIndex !== undefined) ansi16.push(paletteIndex);
    }
  }
  return { rgb, ansi256, ansi16 };
}

function assertSelectedPalette(
  frame: string,
  palette: TerminalTheme,
  capabilities: TerminalCapabilities,
  label: string,
): void {
  if (capabilities.colorDepth === "none") {
    assert(!frame.includes("\u001b["), `${label} emitted CSI without colour`);
    assert(!frame.includes("\u001b]"), `${label} emitted OSC without colour`);
    return;
  }
  const colors = Object.values(palette.colors);
  const selected = sgrColors(frame);
  if (capabilities.colorDepth === "truecolor") {
    const allowed = new Set(colors.map(rgbKey));
    for (const color of selected.rgb) {
      assert(
        allowed.has(color),
        `${label} emitted unselected truecolour ${color}`,
      );
    }
  } else if (capabilities.colorDepth === "ansi256") {
    const allowed = new Set(colors.map(({ ansi256 }) => ansi256));
    for (const color of selected.ansi256) {
      assert(
        allowed.has(color),
        `${label} emitted unselected ANSI 256 index ${color}`,
      );
    }
  } else {
    const allowed = new Set(colors.map(({ ansi16 }) => ansi16));
    for (const color of selected.ansi16) {
      assert(
        allowed.has(color),
        `${label} emitted unselected ANSI 16 index ${color}`,
      );
    }
  }
}

function presentedProps(
  props: unknown,
  presentation: CliPresentationOptions,
): Readonly<Record<string, unknown>> {
  if (typeof props !== "object" || props === null || Array.isArray(props)) {
    throw new TypeError("CLI example props must be a record");
  }
  return {
    ...cliPresentationPassthrough(presentation),
    ...props,
  };
}

function effectivePalette(
  props: Readonly<Record<string, unknown>>,
): TerminalTheme {
  return resolveTerminalTheme(props as CliPresentationOptions);
}

function renderConformantFrame<Props>(
  render: CliRenderer<Props>,
  props: Props,
  presentation: CliPresentationOptions,
  capabilities: TerminalCapabilities,
  label: string,
): string {
  const effectiveProps = presentedProps(props, presentation);
  const frame = render(effectiveProps as Readonly<Props>, capabilities);
  assert(frame.length > 0, `${label} returned an empty frame`);
  assertSelectedPalette(
    frame,
    effectivePalette(effectiveProps),
    capabilities,
    label,
  );
  return frame;
}

const APPEARANCES: readonly Appearance[] = [
  fieldAppearance,
  accentAppearance(120),
  accentAppearance(255),
  accentAppearance(335),
];

Deno.test("every rendered Component props type auto-enrols in the presentation contract", async () => {
  const registryModule = new URL(
    "../../src/generated/cli-registry.ts",
    import.meta.url,
  );
  const contractModule = new URL(
    "../../src/cli/contracts.ts",
    import.meta.url,
  );
  const proofs: string[] = [];
  for (const [slug, entry] of Object.entries(cliComponentRegistry)) {
    if (entry.stance !== "rendered") continue;
    const renderer = new URL(entry.modulePath, registryModule);
    const propsName = `${pascalIdentifier(slug)}CliProps`;
    const source = await Deno.readTextFile(renderer);
    assert(
      new RegExp(
        `export\\s+(?:interface|type)\\s+${propsName}\\b`,
        "u",
      ).test(source),
      `${slug} does not export ${propsName}`,
    );
    proofs.push(
      `MissingPresentationKeys<import(${
        JSON.stringify(renderer.href)
      }).${propsName}>`,
    );
  }

  const temporary = await Deno.makeTempDir({
    prefix: "discern-cli-appearance-contract-",
  });
  const proof = `${temporary}/proof.ts`;
  try {
    await Deno.writeTextFile(
      proof,
      `import type { CliPresentationOptions } from ${
        JSON.stringify(contractModule.href)
      };\n` +
        "type MissingPresentationKeys<Props> = Exclude<keyof CliPresentationOptions, keyof Props>;\n" +
        "type AssertNever<Value extends never> = Value;\n" +
        `export type CliAppearancePopulationProof = [\n  ${
          proofs.map((candidate) => `AssertNever<${candidate}>`).join(",\n  ")
        }\n];\n`,
    );
    const output = await new Deno.Command(Deno.execPath(), {
      args: [
        "check",
        "--config",
        new URL("../../deno.json", import.meta.url).pathname,
        proof,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(
      output.success,
      new TextDecoder().decode(output.stderr),
    );
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
});

Deno.test("every CLI example renders through every appearance pole and colour depth", async () => {
  for (const { slug, entry } of listCliComponents()) {
    if (entry.stance !== "rendered") continue;
    const module = await loadRenderedCliModule(slug, entry);
    for (const example of module.examples) {
      for (
        const colorDepth of [
          "truecolor",
          "ansi256",
          "ansi16",
          "none",
        ] as const
      ) {
        const base = testTerminalCapabilities({
          colorDepth,
          columns: 80,
          hyperlinks: false,
          unicode: true,
        });
        const capabilities = {
          ...resolveCliExampleCapabilities(example, base),
          colorDepth,
          columns: 80,
          hyperlinks: false,
          unicode: true,
        };
        const implicit = module.render(example.props, capabilities);
        const explicitField = module.render(
          presentedProps(example.props, { appearance: fieldAppearance }),
          capabilities,
        );
        assertEquals(
          explicitField,
          implicit,
          `${slug}/${example.name} changed the no-option Field frame`,
        );

        for (const theme of ["light", "dark"] as const) {
          for (const appearance of APPEARANCES) {
            renderConformantFrame(
              module.render,
              example.props,
              { theme, appearance },
              capabilities,
              `${slug}/${example.name} ${theme} ${appearance.name} ${colorDepth}`,
            );
          }
        }
      }
    }
  }
});

Deno.test("every rendered Component family samples Unicode and ASCII at narrow, standard, and wide widths", async () => {
  const sampled = new Set<string>();
  for (const fact of listCliComponents()) {
    if (fact.entry.stance !== "rendered" || sampled.has(fact.group)) continue;
    const module = await loadRenderedCliModule(fact.slug, fact.entry);
    const example = module.examples[0];
    assert(example !== undefined, `${fact.slug} has no example`);
    for (const columns of [24, 80, 120]) {
      for (const unicode of [true, false]) {
        const capabilities = testTerminalCapabilities({
          colorDepth: "ansi16",
          columns,
          hyperlinks: false,
          unicode,
        });
        renderConformantFrame(
          module.render,
          example.props,
          { theme: "dark", appearance: accentAppearance(245) },
          capabilities,
          `${fact.group}/${fact.slug} ${columns} ${
            unicode ? "Unicode" : "ASCII"
          }`,
        );
      }
    }
    sampled.add(fact.group);
  }
  assertEquals(
    [...sampled],
    listCliComponents().filter(({ entry }) => entry.stance === "rendered")
      .map(({ group }) => group).filter((group, index, groups) =>
        groups.indexOf(group) === index
      ),
  );
});

Deno.test("the population guard rejects a future renderer that ignores appearance", () => {
  const selected = resolveTerminalTheme({
    theme: "dark",
    appearance: accentAppearance(137.5),
  });
  const selectedRgb = new Set(Object.values(selected.colors).map(rgbKey));
  const fieldOnly = Object.values(terminalThemes.dark.colors).find((color) =>
    !selectedRgb.has(rgbKey(color))
  );
  assert(fieldOnly !== undefined, "fixture needs a Field-only palette colour");
  const ignored: CliRenderer<
    CliPresentationOptions & { readonly text: string }
  > = (props, capabilities) =>
    styleText(props.text, { color: fieldOnly }, capabilities);

  assertThrows(
    () =>
      renderConformantFrame(
        ignored,
        { text: "ignored" },
        { theme: "dark", appearance: accentAppearance(137.5) },
        testTerminalCapabilities({ colorDepth: "truecolor" }),
        "future-sibling",
      ),
    Error,
    "emitted unselected truecolour",
  );
});
